import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from typing import Dict, Any, Optional

from app.config import settings

# Resilient Google SMTP fallback IP endpoints in case local router DNS times out:
GMAIL_FALLBACK_IPS = ['192.178.158.109', '192.178.211.108', '142.250.192.108', '142.251.10.108']

class EmailService:
    @staticmethod
    def _send_smtp(to_email: str, subject: str, plain_text: str, html_body: str) -> Dict[str, Any]:
        """
        Internal resilient SMTP delivery method with DNS fallback and TLS/SSL retry.
        """
        smtp_host = (settings.SMTP_HOST or "smtp.gmail.com").strip()
        smtp_port = int(settings.SMTP_PORT) if settings.SMTP_PORT else 587
        smtp_user = (settings.SMTP_USER or "").strip()
        smtp_password = (settings.SMTP_PASSWORD or "").strip()
        from_email = (settings.SMTP_FROM_EMAIL or smtp_user or "noreply@kuttystory.co.in").strip()
        from_name = getattr(settings, "SMTP_FROM_NAME", "Kutty Stories") or "Kutty Stories"
        use_tls = settings.SMTP_USE_TLS

        is_placeholder = (
            not smtp_user or
            not smtp_password or
            "your_email" in smtp_user.lower() or
            "your_app_password" in smtp_password.lower() or
            "example.com" in smtp_user.lower()
        )
        if is_placeholder:
            safe_subj = subject.encode("ascii", "replace").decode("ascii")
            print(f"[EmailService - SMTP Notice] Placeholder SMTP credentials in backend/.env. Simulated email delivery to {to_email} for '{safe_subj}'.")
            return {
                "success": True,
                "smtp_sent": False,
                "message": f"SMTP placeholder configured; simulated email sent to {to_email}"
            }

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((from_name, from_email))
        msg["To"] = to_email
        msg.attach(MIMEText(plain_text, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        targets = [smtp_host]
        if "gmail.com" in smtp_host.lower():
            for f_ip in GMAIL_FALLBACK_IPS:
                if f_ip not in targets:
                    targets.append(f_ip)

        sent = False
        last_error = None

        # Try Port 587 (STARTTLS)
        for target in targets:
            try:
                server = smtplib.SMTP(timeout=12)
                server.connect(target, smtp_port)
                server._host = smtp_host
                server.ehlo()
                if use_tls:
                    server.starttls()
                    server.ehlo()
                server.login(smtp_user, smtp_password)
                server.sendmail(from_email, [to_email], msg.as_string())
                server.quit()
                print(f"[EmailService - SMTP Sent] Successfully delivered '{subject}' to {to_email} via {target}:{smtp_port}")
                sent = True
                break
            except Exception as e:
                last_error = e
                print(f"[EmailService] Attempt to send via {target}:{smtp_port} failed: {e}")

        # If port 587 failed, try Port 465 (SSL)
        if not sent:
            for target in targets:
                try:
                    server = smtplib.SMTP_SSL(target, 465, timeout=12)
                    server._host = smtp_host
                    server.ehlo()
                    server.login(smtp_user, smtp_password)
                    server.sendmail(from_email, [to_email], msg.as_string())
                    server.quit()
                    print(f"[EmailService - SMTP Sent] Successfully delivered via SSL 465 ({target}) to {to_email}")
                    sent = True
                    break
                except Exception as e:
                    last_error = e

        if sent:
            return {"success": True, "smtp_sent": True, "message": f"Email delivered to {to_email}"}
        else:
            print(f"[EmailService - SMTP Error] Could not deliver email to {to_email}: {last_error}")
            return {"success": False, "smtp_sent": False, "message": f"Failed to deliver email: {str(last_error)}"}

    @staticmethod
    def send_password_reset_email(to_email: str, reset_code: str, user_name: str = "Admin", expires_minutes: int = 5) -> Dict[str, Any]:
        """
        Sends a password reset email using standard SMTP.
        """
        subject = f"Password Reset Code: {reset_code} - Kutty Story Admin"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F9FD; margin: 0; padding: 24px; color: #1E293B; }}
            .container {{ max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; padding: 36px; border: 1px solid #EFEFEF; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }}
            .brand {{ font-size: 24px; font-weight: 800; color: #8B3DFF; margin-bottom: 24px; }}
            h2 {{ font-size: 20px; font-weight: 700; color: #111827; margin-top: 0; }}
            p {{ font-size: 14px; line-height: 1.6; color: #4B5563; }}
            .code-box {{ background: #F3E8FF; border: 1px dashed #C084FC; border-radius: 14px; padding: 18px; text-align: center; margin: 28px 0; }}
            .code {{ font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #8B3DFF; }}
            .footer {{ font-size: 12px; color: #9CA3AF; margin-top: 32px; padding-top: 20px; border-top: 1px solid #F3F4F6; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="brand">Kutty Story</div>
            <h2>Password Reset Verification</h2>
            <p>Hello {user_name},</p>
            <p>You requested a password reset for your Kutty Story Admin account. Please use the verification code below to set a new password:</p>
            
            <div class="code-box">
              <span class="code">{reset_code}</span>
            </div>

            <p>This verification code is valid for <strong>{expires_minutes} minutes</strong>. If you did not make this request, you can safely ignore this email.</p>
            
            <div class="footer">
              Automated message from Kutty Story Admin Security Service.<br>
              © 2026 Kutty Story Atelier. All rights reserved.
            </div>
          </div>
        </body>
        </html>
        """
        plain_text = f"Hello {user_name},\n\nYour Kutty Story Admin password reset code is: {reset_code}\n\nThis code will expire in {expires_minutes} minutes.\nIf you did not request this, please ignore this email."

        return EmailService._send_smtp(to_email=to_email, subject=subject, plain_text=plain_text, html_body=html_body)

    @staticmethod
    def send_order_status_email(
        to_email: str,
        customer_name: str,
        order_number: str,
        status: str,
        format_type: str = "print_hardcover",
        story_title: str = "Personalized Story",
        child_name: str = "Little Adventurer",
        tracking_number: Optional[str] = None,
        shipping_carrier: Optional[str] = None,
        tracking_url: Optional[str] = None,
        shipping_address_str: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends order status updates and shipping/tracking notifications directly to the customer's email.
        """
        if not to_email or not to_email.strip():
            return {"success": False, "smtp_sent": False, "message": "No customer email provided."}

        to_email = to_email.strip()
        cust_name = customer_name.strip() if customer_name else "Valued Customer"
        order_num = order_number or "N/A"
        clean_status = (status or "Updated").strip()
        status_lower = clean_status.lower()

        # Formatting status badge and colors
        if status_lower == "shipped":
            badge_bg = "#EDE9FE"
            badge_color = "#7C3AED"
            badge_text = "SHIPPED 🚀"
            subject = f"Your Hardcover Storybook Has Shipped! 🚀 (Order #{order_num})"
            headline = "Your Book is on Its Way!"
            intro_msg = f"Exciting news! The keepsake hardcover edition of <strong>{story_title}</strong> crafted especially for <strong>{child_name}</strong> has been bound, inspected, and shipped."
        elif status_lower in ["in production", "printing"]:
            badge_bg = "#FEF3C7"
            badge_color = "#B45309"
            badge_text = "IN PRODUCTION 🎨"
            subject = f"Your Storybook is Being Handcrafted! 🎨 (Order #{order_num})"
            headline = "Crafting Your Keepsake Edition!"
            intro_msg = f"Great news! Our atelier has started printing and hand-binding your personalized storybook <strong>{story_title}</strong> for <strong>{child_name}</strong> using archival quality paper and vibrant inks."
        elif status_lower == "delivered":
            badge_bg = "#D1FAE5"
            badge_color = "#047857"
            badge_text = "DELIVERED 📖✨"
            subject = f"Your Storybook Has Arrived! 📖✨ (Order #{order_num})"
            headline = "Delivered with Love!"
            intro_msg = f"Your personalized keepsake hardcover book for <strong>{child_name}</strong> has been delivered! We hope reading this enchanting tale brings wonderful smiles and lifelong memories."
        elif status_lower == "paid":
            badge_bg = "#E0F2FE"
            badge_color = "#0369A1"
            badge_text = "ORDER CONFIRMED ✅"
            subject = f"Order Confirmed: {story_title} (Order #{order_num})"
            headline = "Thank You for Your Order!"
            intro_msg = f"Your payment has been successfully received for the keepsake edition of <strong>{story_title}</strong> for <strong>{child_name}</strong>. We are preparing everything for production."
        else:
            badge_bg = "#F3F4F6"
            badge_color = "#374151"
            badge_text = clean_status.upper()
            subject = f"Order #{order_num} Status Update: {clean_status}"
            headline = f"Order Status: {clean_status}"
            intro_msg = f"Your order for <strong>{story_title}</strong> ({child_name}) has been updated to <strong>{clean_status}</strong>."

        # Shipping & Tracking section if available
        tracking_html = ""
        tracking_plain = ""
        if status_lower == "shipped" or tracking_number or shipping_carrier:
            carrier_str = shipping_carrier or "Express Courier"
            tracking_num_str = tracking_number or "Will be updated shortly"
            cta_button = ""
            if tracking_url and tracking_url.strip():
                clean_url = tracking_url.strip()
                cta_button = f"""
                <div style="text-align: center; margin: 24px 0 10px 0;">
                  <a href="{clean_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #8B3DFF, #6D28D9); color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 28px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(139, 61, 255, 0.35);">
                    Track Your Package →
                  </a>
                </div>
                <div style="text-align: center; font-size: 11px; color: #9CA3AF; margin-bottom: 8px;">
                  Or track directly: <a href="{clean_url}" style="color: #8B3DFF; text-decoration: underline;">{clean_url}</a>
                </div>
                """
                tracking_plain += f"\nTracking URL: {clean_url}\n"

            tracking_html = f"""
            <div style="background: #FAF7F2; border: 1.5px solid #F0E8DD; border-radius: 16px; padding: 20px; margin: 24px 0;">
              <div style="font-size: 11px; font-weight: 700; color: #8B3DFF; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">
                📦 Courier & Tracking Information
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 6px 0; color: #6B7280; width: 40%;">Shipping Carrier:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 600;">{carrier_str}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6B7280;">Tracking / AWB Number:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 700; font-family: monospace; font-size: 14px; letter-spacing: 0.5px;">{tracking_num_str}</td>
                </tr>
              </table>
              {cta_button}
            </div>
            """
            tracking_plain += f"\nCourier: {carrier_str}\nTracking Number: {tracking_num_str}\n"

        # Address parsing if present
        address_html = ""
        address_plain = ""
        if shipping_address_str:
            import json
            try:
                addr = json.loads(shipping_address_str) if isinstance(shipping_address_str, str) else shipping_address_str
                if isinstance(addr, dict):
                    parts = [
                        addr.get("full_name") or addr.get("name"),
                        addr.get("street_address") or addr.get("address"),
                        addr.get("landmark"),
                        f"{addr.get('city')}, {addr.get('state')} - {addr.get('pincode')}" if addr.get('pincode') else None,
                        f"Phone: {addr.get('phone')}" if addr.get('phone') else None
                    ]
                    clean_parts = [p for p in parts if p]
                    if clean_parts:
                        lines = "<br>".join(clean_parts)
                        address_html = f"""
                        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 14px; padding: 16px; margin: 20px 0; font-size: 12px; line-height: 1.6; color: #4B5563;">
                          <strong style="color: #111827; display: block; margin-bottom: 6px;">📍 Shipping Address:</strong>
                          {lines}
                        </div>
                        """
                        address_plain = "\nShipping Address:\n" + "\n".join(clean_parts) + "\n"
            except Exception:
                pass

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF8F5; margin: 0; padding: 24px 12px; color: #1F2937; }}
            .card {{ max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 24px; padding: 36px 32px; border: 1px solid #F0EDE8; box-shadow: 0 4px 24px rgba(0,0,0,0.04); }}
            .brand {{ font-size: 22px; font-weight: 800; color: #8B3DFF; letter-spacing: -0.5px; margin-bottom: 20px; }}
            .badge {{ display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; background-color: {badge_bg}; color: {badge_color}; margin-bottom: 16px; }}
            h1 {{ font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 12px 0; letter-spacing: -0.3px; }}
            p {{ font-size: 14px; line-height: 1.6; color: #4B5563; margin: 0 0 16px 0; }}
            .order-summary {{ background: #FDFBF7; border: 1px solid #F3EDE2; border-radius: 14px; padding: 16px 18px; margin: 20px 0; font-size: 13px; }}
            .order-summary table {{ width: 100%; border-collapse: collapse; }}
            .order-summary td {{ padding: 5px 0; }}
            .label {{ color: #9CA3AF; width: 35%; }}
            .val {{ color: #111827; font-weight: 600; text-align: right; }}
            .footer {{ font-size: 11px; color: #9CA3AF; line-height: 1.6; margin-top: 32px; padding-top: 20px; border-top: 1px solid #F3F4F6; text-align: center; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">✨ Kutty Story Atelier</div>
            <div class="badge">{badge_text}</div>
            <h1>{headline}</h1>
            <p>Hello {cust_name},</p>
            <p>{intro_msg}</p>

            <div class="order-summary">
              <table>
                <tr>
                  <td class="label">Order Number:</td>
                  <td class="val">{order_num}</td>
                </tr>
                <tr>
                  <td class="label">Story Title:</td>
                  <td class="val">{story_title}</td>
                </tr>
                <tr>
                  <td class="label">Child's Name:</td>
                  <td class="val">{child_name}</td>
                </tr>
                <tr>
                  <td class="label">Edition:</td>
                  <td class="val">{ "Hardcover Keepsake (8x8 inch)" if format_type != "digital" else "Personalized Digital Edition" }</td>
                </tr>
              </table>
            </div>

            {tracking_html}

            {address_html}

            <p style="font-size: 13px; color: #6B7280; margin-top: 24px;">
              Have questions about your order? Simply reply to this email or contact our support team at <a href="mailto:info@kuttystory.co.in" style="color: #8B3DFF; text-decoration: underline;">info@kuttystory.co.in</a>.
            </p>

            <div class="footer">
              Thank you for choosing Kutty Story to bring your child's imagination to life.<br>
              © 2026 Kutty Story Atelier. All rights reserved.
            </div>
          </div>
        </body>
        </html>
        """

        plain_text = f"Hello {cust_name},\n\n{headline}\n\nOrder: {order_num}\nStory: {story_title}\nChild: {child_name}\nStatus: {clean_status}\n{tracking_plain}{address_plain}\nThank you for choosing Kutty Story!\ninfo@kuttystory.co.in"

        return EmailService._send_smtp(to_email=to_email, subject=subject, plain_text=plain_text, html_body=html_body)
