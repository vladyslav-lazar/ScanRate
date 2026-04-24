import resend
import os

resend.api_key = os.getenv("RESEND_API_KEY", "")
FRONTEND_URL   = os.getenv("FRONTEND_URL", "http://frontend:5173")


def send_magic_link(to_email: str, token: str):
    link = f"{FRONTEND_URL}/auth/verify?token={token}"
    resend.Emails.send({
        "from":    "noreply@scanrate.pp.ua",
        "to":      to_email,
        "subject": "Вхід в аккаунт ScanRate",
        "html":    f"""
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#000;color:#fff;">
                <h2 style="margin:0 0 8px;color:#fff;">Вхід в аккаунт ScanRate</h2>
                <p style="color:#888;margin:0 0 24px;">
                    Нажміть на кнопку знизу для входу у Ваш аккаунт. 
                    Це посилання буде активне тільки 15 хвидин і є одноразовим.
                </p>
                <a href="{link}"
                   style="display:inline-block;padding:14px 28px;background:#00ff88;
                          color:#000;text-decoration:none;border-radius:8px;
                          font-weight:700;font-size:15px;">
                    Увійти
                </a>
                <p style="color:#555;font-size:12px;margin:24px 0 0;">
                    Якщо це не Ви оформлювали цей запит, можете ігнорувати цей лист.
                </p>
            </div>
        """,
    })