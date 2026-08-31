import psycopg2
import uuid
from datetime import datetime, timedelta

#configs
hostname = 'localhost'
username = 'postgres'
db_name = 'erp'
port_id = 5432
pwd = 'hacker123'

# hard code nga allowed emails
ALLOWED_EMAILS = {"okims@gmail.com", "test@example.com"}

def generate_uuid():
    return str(uuid.uuid4())

def send_email(email, uuid_key):
    # Simulate sending an email — print the key in the terminal
    print(f" Sending email to {email}")
    print(f" Your login key (UUID): {uuid_key}")
    print("Copy this UUID to log in.\n")

def main():
    with psycopg2.connect(
        host=hostname,
        user=username,
        database=db_name,
        port=port_id,
        password=pwd
    ) as conn:
        print("Connection successful!")
        with conn.cursor() as cur:

            email = input(" Enter your email: ").strip()
            if email not in ALLOWED_EMAILS:
                print("Email not authorized.")
                return

            new_uuid = generate_uuid()
            expires_at = datetime.now() + timedelta(minutes=15)

            cur.execute(
                """
                INSERT INTO auth_emails (id, email, expires_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (email) DO UPDATE
                SET id = EXCLUDED.id,
                    expires_at = EXCLUDED.expires_at,
                    used_at = NULL
                """,
                (new_uuid, email, expires_at)
            )
            conn.commit()
            print(" UUID generated and stored.")

            send_email(email, new_uuid)

            print(" Simulating admin login...")
            key = input("Paste the UUID to log in: ").strip()

            cur.execute(
                """
                SELECT id, email, used_at, expires_at
                FROM auth_emails
                WHERE id = %s AND used_at IS NULL AND expires_at > NOW()
                """,
                (key,)
            )
            result = cur.fetchone()

            if result:
                uuid_key, user_email, used_at, expires_at = result
                print(f" Login successful! Welcome, {user_email}.")
                # Mark as used
                cur.execute(
                    "UPDATE auth_emails SET used_at = NOW() WHERE id = %s",
                    (uuid_key,)
                )
                conn.commit()
            else:
                print(" Invalid, expired, or already used UUID.")

if __name__ == "__main__":
    main()