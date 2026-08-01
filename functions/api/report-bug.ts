import { jsonResponse, handleOptions } from './_helper';

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  const corsResponse = handleOptions(request);
  if (corsResponse) return corsResponse;

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await request.json();
    const { userEmail, userId, category, title, description, userAgent, pageUrl } = body || {};

    if (!userEmail || !description) {
      return jsonResponse({ error: 'Email dan detail keluhan wajib diisi.' }, 400);
    }

    const bugCategory = category || 'General / Lainnya';
    const bugTitle = title || 'Laporan Kendala Aplikasi';
    const reportId = `bug_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();

    // 1. Save to Cloudflare D1 Database if available
    let savedToDb = false;
    if (env.DB) {
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS bug_reports (
            id TEXT PRIMARY KEY,
            userEmail TEXT NOT NULL,
            userId TEXT,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            userAgent TEXT,
            pageUrl TEXT,
            status TEXT DEFAULT 'pending',
            createdAt TEXT NOT NULL
          )
        `).run();

        await env.DB.prepare(`
          INSERT INTO bug_reports (id, userEmail, userId, category, title, description, userAgent, pageUrl, status, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `).bind(
          reportId,
          userEmail,
          userId || null,
          bugCategory,
          bugTitle,
          description,
          userAgent || request.headers.get('user-agent') || '',
          pageUrl || '',
          createdAt
        ).run();

        savedToDb = true;
      } catch (dbErr) {
        console.error('Failed to insert bug report into D1:', dbErr);
      }
    }

    // 2. Prepare HTML Email template for arianrisqi@gmail.com
    const emailSubject = `[Taskwai Bug Report] ${bugCategory}: ${bugTitle}`;
    const htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700;">
            🐛 Laporan Bug / Kendala Taskwai
          </h2>
          <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">
            Laporan baru masuk dari pengguna terdaftar
          </p>
        </div>
        
        <div style="padding: 24px;">
          <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600;">Identitas Pengirim</p>
            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #0f172a;">
              ${userEmail}
            </p>
            ${userId ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">User ID: ${userId}</p>` : ''}
          </div>

          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b; font-weight: 600;">Kategori</p>
            <span style="display: inline-block; background-color: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600;">
              ${bugCategory}
            </span>
          </div>

          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b; font-weight: 600;">Subjek / Judul</p>
            <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1e293b;">${bugTitle}</p>
          </div>

          <div style="margin-bottom: 24px;">
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Detail Keluhan</p>
            <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #334155;">${description}</div>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

          <div style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
            <p style="margin: 0 0 4px 0;"><strong>Halaman:</strong> ${pageUrl || '-'}</p>
            <p style="margin: 0 0 4px 0;"><strong>Browser Info:</strong> ${userAgent || '-'}</p>
            <p style="margin: 0;"><strong>Waktu Laporan:</strong> ${new Date(createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>
          </div>
        </div>
      </div>
    `;

    // 3. Attempt Sending Email via Resend API if API Key exists
    let emailSent = false;
    const resendApiKey = env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: 'Taskwai App <onboarding@resend.dev>',
            to: ['arianrisqi@gmail.com'],
            reply_to: userEmail,
            subject: emailSubject,
            html: htmlBody
          })
        });

        if (resendRes.ok) {
          emailSent = true;
        } else {
          const errData = await resendRes.text();
          console.error('Resend API error:', errData);
        }
      } catch (emailErr) {
        console.error('Failed to send email via Resend API:', emailErr);
      }
    }

    return jsonResponse({
      success: true,
      reportId,
      savedToDb,
      emailSent,
      message: 'Laporan bug berhasil dikirim! Terima kasih atas masukan Anda.'
    }, 200);

  } catch (error: any) {
    console.error('Error in /api/report-bug:', error);
    return jsonResponse({ error: 'Terjadi kesalahan pada server saat mengirim laporan.' }, 500);
  }
}
