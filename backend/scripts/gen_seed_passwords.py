"""Generate bcrypt (cost 12) hashes for seed_data.sql — run once, paste output."""
import bcrypt

# email -> password (must match README / seed comments)
PAIRS = [
    ("admin@hcb.com", "Admin@1234"),
    ("super@hcb.com", "Super@1234"),
    ("bureau.admin@hcb.com", "Bureau@1234"),
    ("analyst@hcb.com", "Analyst@1234"),
    ("viewer@hcb.com", "Viewer@1234"),
    ("apiuser@hcb.com", "ApiUser@1234"),
    ("inst.admin@fnb.co.ke", "InstAdmin@1234"),
    ("compliance@fnb.co.ke", "Comply@1234"),
    ("ops@metrocu.co.ke", "OpsUser@1234"),
    ("suspended@hcb.com", "Suspended@1234"),
    ("james.mthembu@fnb.co.za", "James@1234"),
    ("david.kim@pacificfin.com", "David@1234"),
]

for email, pwd in PAIRS:
    h = bcrypt.hashpw(pwd.encode(), bcrypt.gensalt(rounds=12)).decode()
    print(f"-- {email}")
    print(f"-- UPDATE users SET password_hash = '{h}' WHERE email = '{email}';")
