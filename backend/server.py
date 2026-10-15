from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field
from typing import Annotated, List, Literal, Optional
from datetime import datetime, timedelta, timezone, date as date_cls
from zoneinfo import ZoneInfo
from pathlib import Path
from bson import ObjectId
import bcrypt
import jwt
import os
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
TOKEN_DAYS = 30
TZ = ZoneInfo("America/Sao_Paulo")
SLOT_HOURS = [9, 10, 11, 13, 14, 15, 16, 17, 18]
BOOKING_DAYS_AHEAD = 30

app = FastAPI()


@app.get("/health", include_in_schema=False)
@app.head("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}


api_router = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------------- Models ----------------
PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc: dict):
        return cls.model_validate(doc)

    def to_mongo(self) -> dict:
        data = self.model_dump(by_alias=True, exclude={"id"})
        data.pop("_id", None)
        return data


class User(BaseDocument):
    name: str
    email: EmailStr
    phone: str = ""
    password_hash: str
    role: Literal["client", "admin"] = "client"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str = ""
    role: str


class SessionType(BaseDocument):
    name: str
    description: str = ""
    duration_min: int = 60
    price: float = 0
    modality: Literal["presencial", "distancia"] = "presencial"
    active: bool = True


class SessionTypeIn(BaseModel):
    name: str = Field(min_length=2)
    description: str = ""
    duration_min: int = Field(ge=10, le=300)
    price: float = Field(ge=0)
    modality: Literal["presencial", "distancia"] = "presencial"
    active: bool = True


class Booking(BaseDocument):
    user_id: str
    user_name: str
    user_email: str
    user_phone: str = ""
    session_type_id: str
    session_name: str
    modality: str
    duration_min: int
    price: float
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    notes: str = ""
    status: Literal["pending", "confirmed", "cancelled"] = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class BookingIn(BaseModel):
    session_type_id: str
    date: str
    time: str
    notes: str = ""


class RegisterIn(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    phone: str = ""
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


# ---------------- Auth helpers ----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())


def create_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": user.id, "role": user.role, "iat": now, "exp": now + timedelta(days=TOKEN_DAYS)},
                      JWT_SECRET, algorithm=JWT_ALGORITHM)


def public_user(u: User) -> UserOut:
    return UserOut(id=u.id, name=u.name, email=u.email, phone=u.phone, role=u.role)


def oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(404, "Não encontrado")
    return ObjectId(value)


async def current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> User:
    err = HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão inválida ou expirada")
    if not credentials:
        raise err
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise err
    sub = payload.get("sub")
    if not isinstance(sub, str) or not ObjectId.is_valid(sub):
        raise err
    doc = await db.users.find_one({"_id": ObjectId(sub)})
    if not doc:
        raise err
    return User.from_mongo(doc)


async def admin_only(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Acesso restrito ao terapeuta")
    return user


# ---------------- Auth routes ----------------
@api_router.post("/auth/register", status_code=201)
async def register(body: RegisterIn):
    email = str(body.email).lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "Este e-mail já está cadastrado")
    user = User(name=body.name.strip(), email=email, phone=body.phone.strip(), password_hash=hash_password(body.password))
    res = await db.users.insert_one(user.to_mongo())
    user.id = str(res.inserted_id)
    return {"access_token": create_token(user), "user": public_user(user)}


@api_router.post("/auth/login")
async def login(body: LoginIn):
    doc = await db.users.find_one({"email": str(body.email).lower()})
    if not doc or not verify_password(body.password, doc["password_hash"]):
        raise HTTPException(401, "E-mail ou senha incorretos")
    user = User.from_mongo(doc)
    return {"access_token": create_token(user), "user": public_user(user)}


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: User = Depends(current_user)):
    return public_user(user)


# ---------------- Session types ----------------
@api_router.get("/session-types", response_model=List[SessionType])
async def list_session_types(all: bool = False, user: User = Depends(current_user)):
    query = {} if (all and user.role == "admin") else {"active": True}
    docs = await db.session_types.find(query).sort("name", 1).to_list(200)
    return [SessionType.from_mongo(d) for d in docs]


@api_router.post("/session-types", response_model=SessionType, status_code=201)
async def create_session_type(body: SessionTypeIn, _: User = Depends(admin_only)):
    st = SessionType(**body.model_dump())
    res = await db.session_types.insert_one(st.to_mongo())
    st.id = str(res.inserted_id)
    return st


@api_router.put("/session-types/{st_id}", response_model=SessionType)
async def update_session_type(st_id: str, body: SessionTypeIn, _: User = Depends(admin_only)):
    res = await db.session_types.find_one_and_update({"_id": oid(st_id)}, {"$set": body.model_dump()}, return_document=True)
    if not res:
        raise HTTPException(404, "Tipo de sessão não encontrado")
    return SessionType.from_mongo(res)


@api_router.delete("/session-types/{st_id}")
async def delete_session_type(st_id: str, _: User = Depends(admin_only)):
    res = await db.session_types.delete_one({"_id": oid(st_id)})
    if res.deleted_count == 0:
        raise HTTPException(404, "Tipo de sessão não encontrado")
    return {"ok": True}


# ---------------- Availability ----------------
def parse_date(value: str) -> date_cls:
    try:
        return date_cls.fromisoformat(value)
    except ValueError:
        raise HTTPException(400, "Data inválida")


def slot_list(d: date_cls) -> List[str]:
    if d.weekday() == 6:  # domingo fechado
        return []
    now = datetime.now(TZ)
    out = []
    for h in SLOT_HOURS:
        start = datetime(d.year, d.month, d.day, h, 0, tzinfo=TZ)
        if start > now + timedelta(hours=1):
            out.append(f"{h:02d}:00")
    return out


@api_router.get("/availability")
async def availability(date: str, _: User = Depends(current_user)):
    d = parse_date(date)
    today = datetime.now(TZ).date()
    if d < today or d > today + timedelta(days=BOOKING_DAYS_AHEAD):
        return {"date": date, "slots": []}
    taken = {b["time"] async for b in db.bookings.find({"date": date, "status": {"$ne": "cancelled"}}, {"time": 1})}
    return {"date": date, "slots": [{"time": t, "available": t not in taken} for t in slot_list(d)]}


# ---------------- Bookings ----------------
@api_router.post("/bookings", response_model=Booking, status_code=201)
async def create_booking(body: BookingIn, user: User = Depends(current_user)):
    st_doc = await db.session_types.find_one({"_id": oid(body.session_type_id), "active": True})
    if not st_doc:
        raise HTTPException(404, "Tipo de sessão não encontrado")
    st = SessionType.from_mongo(st_doc)
    d = parse_date(body.date)
    today = datetime.now(TZ).date()
    if d < today or d > today + timedelta(days=BOOKING_DAYS_AHEAD) or body.time not in slot_list(d):
        raise HTTPException(400, "Horário indisponível")
    if await db.bookings.find_one({"date": body.date, "time": body.time, "status": {"$ne": "cancelled"}}):
        raise HTTPException(409, "Este horário acabou de ser reservado. Escolha outro.")
    booking = Booking(user_id=user.id, user_name=user.name, user_email=user.email, user_phone=user.phone,
                      session_type_id=st.id, session_name=st.name, modality=st.modality,
                      duration_min=st.duration_min, price=st.price, date=body.date, time=body.time,
                      notes=body.notes.strip())
    res = await db.bookings.insert_one(booking.to_mongo())
    booking.id = str(res.inserted_id)
    return booking


@api_router.get("/bookings/me", response_model=List[Booking])
async def my_bookings(user: User = Depends(current_user)):
    docs = await db.bookings.find({"user_id": user.id}).sort([("date", 1), ("time", 1)]).to_list(500)
    return [Booking.from_mongo(d) for d in docs]


@api_router.post("/bookings/{booking_id}/cancel", response_model=Booking)
async def cancel_booking(booking_id: str, user: User = Depends(current_user)):
    doc = await db.bookings.find_one({"_id": oid(booking_id)})
    if not doc or (user.role != "admin" and doc["user_id"] != user.id):
        raise HTTPException(404, "Agendamento não encontrado")
    if doc["status"] == "cancelled":
        raise HTTPException(400, "Agendamento já cancelado")
    res = await db.bookings.find_one_and_update({"_id": doc["_id"]}, {"$set": {"status": "cancelled"}}, return_document=True)
    return Booking.from_mongo(res)


@api_router.post("/admin/bookings/{booking_id}/confirm", response_model=Booking)
async def confirm_booking(booking_id: str, _: User = Depends(admin_only)):
    doc = await db.bookings.find_one({"_id": oid(booking_id)})
    if not doc:
        raise HTTPException(404, "Agendamento não encontrado")
    if doc["status"] != "pending":
        raise HTTPException(400, "Apenas agendamentos pendentes podem ser confirmados")
    res = await db.bookings.find_one_and_update({"_id": doc["_id"]}, {"$set": {"status": "confirmed"}}, return_document=True)
    return Booking.from_mongo(res)


@api_router.get("/admin/bookings", response_model=List[Booking])
async def admin_bookings(date: Optional[str] = None, _: User = Depends(admin_only)):
    query: dict = {}
    if date:
        query["date"] = date
    else:
        query["date"] = {"$gte": datetime.now(TZ).date().isoformat()}
    docs = await db.bookings.find(query).sort([("date", 1), ("time", 1)]).to_list(1000)
    return [Booking.from_mongo(d) for d in docs]


@api_router.get("/admin/stats")
async def admin_stats(_: User = Depends(admin_only)):
    today = datetime.now(TZ).date().isoformat()
    active = {"$ne": "cancelled"}
    return {
        "today": await db.bookings.count_documents({"date": today, "status": active}),
        "pending": await db.bookings.count_documents({"date": {"$gte": today}, "status": "pending"}),
        "upcoming": await db.bookings.count_documents({"date": {"$gte": today}, "status": active}),
        "clients": await db.users.count_documents({"role": "client"}),
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_SESSION_TYPES = [
    {"name": "Reiki Presencial", "description": "Sessão completa de harmonização energética no espaço ORUN.", "duration_min": 60, "price": 150, "modality": "presencial"},
    {"name": "Reiki à Distância", "description": "Envio de energia Reiki onde você estiver, com acolhimento por chamada.", "duration_min": 45, "price": 120, "modality": "distancia"},
    {"name": "Reiki + Cristais", "description": "Reiki combinado com terapia de cristais para equilíbrio dos chakras.", "duration_min": 90, "price": 200, "modality": "presencial"},
]


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.bookings.create_index([("date", 1), ("time", 1)])
    admin_email = os.environ['ADMIN_EMAIL'].lower()
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        admin = User(name="Terapeuta ORUN", email=admin_email, password_hash=hash_password(os.environ['ADMIN_PASSWORD']), role="admin")
        await db.users.insert_one(admin.to_mongo())
    elif existing.get("role") != "admin":
        await db.users.update_one({"_id": existing["_id"]}, {"$set": {"role": "admin"}})
    if await db.session_types.count_documents({}) == 0:
        await db.session_types.insert_many([SessionType(**s).to_mongo() for s in DEFAULT_SESSION_TYPES])


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
