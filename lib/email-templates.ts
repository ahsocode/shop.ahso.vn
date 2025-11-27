// lib/email-templates.ts
import { EMAIL_CONFIG, formatVND } from "./email-config";

type OrderEmailData = {
  code: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  discount: number;
  vat: number;
  shippingFee: number;
  grandTotal: number;
};

// 1️⃣ Email xác nhận đơn hàng cho khách
export function generateOrderConfirmationEmail(data: OrderEmailData) {
  const itemsText = data.items
    .map((it) => {
      const lineTotal = it.price * it.quantity;
      return `- ${it.name} (SKU: ${it.sku}) x${it.quantity} = ${formatVND(lineTotal)}`;
    })
    .join("\n");

  const text = `
Cảm ơn bạn đã đặt hàng tại AHSO Industrial!

Mã đơn hàng: ${data.code}
Họ tên: ${data.customerName}
Số tiền cần thanh toán: ${formatVND(data.grandTotal)}

Chi tiết đơn hàng:
${itemsText}

Tạm tính: ${formatVND(data.subtotal)}
Giảm giá: -${formatVND(data.discount)}
VAT (10%): ${formatVND(data.vat)}
Phí vận chuyển: ${formatVND(data.shippingFee)}
Tổng cộng: ${formatVND(data.grandTotal)}

Thông tin chuyển khoản:
- Ngân hàng: TPBank – Chi nhánh Bình Chánh
- Số tài khoản: 03168969399
- Chủ tài khoản: CÔNG TY TNHH AHSO
- Nội dung chuyển khoản: ${data.code}

Vui lòng chuyển khoản với đúng nội dung trên để chúng tôi xác nhận thanh toán nhanh chóng.

Trân trọng,
AHSO Industrial
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .order-info { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .items { margin: 20px 0; }
    .item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .total { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .bank-info { background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Đơn hàng đã được tạo thành công!</h1>
    </div>
    <div class="content">
      <p>Xin chào <strong>${data.customerName}</strong>,</p>
      <p>Cảm ơn bạn đã đặt hàng tại AHSO Industrial! Đơn hàng của bạn đã được ghi nhận.</p>
      
      <div class="order-info">
        <h3>📋 Thông tin đơn hàng</h3>
        <p><strong>Mã đơn hàng:</strong> ${data.code}</p>
        <p><strong>Tổng thanh toán:</strong> <span style="color: #1e40af; font-size: 24px; font-weight: bold;">${formatVND(data.grandTotal)}</span></p>
      </div>

      <div class="items">
        <h3>📦 Chi tiết sản phẩm</h3>
        ${data.items.map((it) => `
          <div class="item">
            <strong>${it.name}</strong><br>
            <small>SKU: ${it.sku}</small><br>
            Số lượng: ${it.quantity} x ${formatVND(it.price)} = ${formatVND(it.price * it.quantity)}
          </div>
        `).join("")}
      </div>

      <div class="total">
        <table width="100%" style="font-size: 14px;">
          <tr><td>Tạm tính:</td><td align="right">${formatVND(data.subtotal)}</td></tr>
          <tr><td>Giảm giá:</td><td align="right">-${formatVND(data.discount)}</td></tr>
          <tr><td>VAT (10%):</td><td align="right">${formatVND(data.vat)}</td></tr>
          <tr><td>Phí vận chuyển:</td><td align="right">${formatVND(data.shippingFee)}</td></tr>
          <tr style="font-weight: bold; font-size: 16px; border-top: 2px solid #1e40af;">
            <td style="padding-top: 10px;">Tổng cộng:</td>
            <td align="right" style="padding-top: 10px; color: #1e40af;">${formatVND(data.grandTotal)}</td>
          </tr>
        </table>
      </div>

      <div class="bank-info">
        <h3>💳 Thông tin chuyển khoản</h3>
        <p><strong>Ngân hàng:</strong> TPBank – Chi nhánh Bình Chánh</p>
        <p><strong>Số tài khoản:</strong> 03168969399</p>
        <p><strong>Chủ tài khoản:</strong> CÔNG TY TNHH AHSO</p>
        <p><strong>Nội dung:</strong> <span style="background: #fff; padding: 5px 10px; border-radius: 4px; font-weight: bold;">${data.code}</span></p>
        <p style="color: #92400e; margin-top: 15px;">⚠️ Vui lòng chuyển khoản với đúng nội dung trên để chúng tôi xác nhận nhanh chóng.</p>
      </div>

      <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
    </div>
    <div class="footer">
      <p>Trân trọng,<br><strong>AHSO Industrial</strong></p>
      <p style="font-size: 12px;">Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>
  `;

  return {
    subject: EMAIL_CONFIG.TEMPLATES.ORDER_CREATED.subject(data.code),
    text,
    html,
  };
}

// 2️⃣ Email thông báo cho admin về đơn hàng mới
export function generateNewOrderAdminEmail(data: OrderEmailData) {
  const itemsText = data.items
    .map((it) => `- ${it.name} (${it.sku}) x${it.quantity}`)
    .join("\n");

  const text = `
🔔 ĐỚN HÀNG MỚI CẦN XỬ LÝ

Mã đơn hàng: ${data.code}
Khách hàng: ${data.customerName}
Email: ${data.customerEmail}
Tổng tiền: ${formatVND(data.grandTotal)}

Sản phẩm:
${itemsText}

⚠️ Vui lòng kiểm tra ngân hàng và xác nhận thanh toán sớm nhất.

Link quản lý: ${process.env.NEXT_PUBLIC_SITE_URL}/staff/orders/${data.code}
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 20px; border: 2px solid #dc2626; }
    .info { background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .btn { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🔔 ĐƠN HÀNG MỚI CẦN XỬ LÝ</h2>
    </div>
    <div class="content">
      <div class="info">
        <h3>📋 Thông tin đơn hàng</h3>
        <p><strong>Mã:</strong> ${data.code}</p>
        <p><strong>Khách hàng:</strong> ${data.customerName}</p>
        <p><strong>Email:</strong> ${data.customerEmail}</p>
        <p><strong>Tổng tiền:</strong> <span style="color: #dc2626; font-size: 20px;">${formatVND(data.grandTotal)}</span></p>
      </div>

      <h3>📦 Sản phẩm</h3>
      ${data.items.map((it) => `<p>• ${it.name} (${it.sku}) x${it.quantity}</p>`).join("")}

      <p style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px;">
        ⚠️ <strong>Vui lòng kiểm tra ngân hàng và xác nhận thanh toán sớm nhất.</strong>
      </p>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/staff/orders" class="btn">Xem chi tiết đơn hàng</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return {
    subject: EMAIL_CONFIG.TEMPLATES.ORDER_CREATED.adminSubject(data.code),
    text,
    html,
  };
}

// 3️⃣ Email xác nhận đã thanh toán
export function generateOrderPaidEmail(orderCode: string, customerName: string) {
  const text = `
Xin chào ${customerName},

Đơn hàng ${orderCode} của bạn đã được xác nhận thanh toán thành công! ✅

Chúng tôi đang tiến hành chuẩn bị hàng và sẽ giao cho đơn vị vận chuyển sớm nhất.

Cảm ơn bạn đã tin tưởng lựa chọn AHSO Industrial!

Trân trọng,
AHSO Industrial
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .success { background: #d1fae5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Thanh toán thành công!</h1>
    </div>
    <div class="content">
      <p>Xin chào <strong>${customerName}</strong>,</p>
      
      <div class="success">
        <h3>🎉 Đơn hàng <strong>${orderCode}</strong> đã được xác nhận thanh toán!</h3>
        <p>Chúng tôi đang tiến hành chuẩn bị hàng và sẽ giao cho đơn vị vận chuyển trong thời gian sớm nhất.</p>
      </div>

      <p>Bạn sẽ nhận được email thông báo khi đơn hàng được giao cho đơn vị vận chuyển.</p>
      
      <p style="margin-top: 30px;">Cảm ơn bạn đã tin tưởng lựa chọn AHSO Industrial! 🙏</p>
    </div>
    <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
      <p>Trân trọng,<br><strong>AHSO Industrial</strong></p>
    </div>
  </div>
</body>
</html>
  `;

  return {
    subject: EMAIL_CONFIG.TEMPLATES.ORDER_PAID.subject(orderCode),
    text,
    html,
  };
}

// 4️⃣ Email thông báo đã gửi hàng
export function generateOrderShippedEmail(orderCode: string, customerName: string, shippingMethod?: string) {
  const text = `
Xin chào ${customerName},

Đơn hàng ${orderCode} của bạn đã được bàn giao cho đơn vị vận chuyển! 📦

${shippingMethod ? `Đơn vị vận chuyển: ${shippingMethod}` : ""}

⚠️ LƯU Ý QUAN TRỌNG:
- Vui lòng kiểm tra kỹ hàng hóa khi nhận
- Quay video khi mở hàng để làm bằng chứng
- Chỉ chấp nhận hoàn hàng/đổi trả khi có video đối chứng

Nếu có bất kỳ vấn đề gì, vui lòng liên hệ ngay với chúng tôi.

Trân trọng,
AHSO Industrial
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .info { background: #eef2ff; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1; margin: 20px 0; }
    .warning { background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 Đơn hàng đang được giao!</h1>
    </div>
    <div class="content">
      <p>Xin chào <strong>${customerName}</strong>,</p>
      
      <div class="info">
        <h3>🚚 Đơn hàng <strong>${orderCode}</strong> đã được giao cho vận chuyển!</h3>
        ${shippingMethod ? `<p><strong>Đơn vị vận chuyển:</strong> ${shippingMethod}</p>` : ""}
        <p>Hàng sẽ được giao đến bạn trong thời gian sớm nhất.</p>
      </div>

      <div class="warning">
        <h3>⚠️ LƯU Ý QUAN TRỌNG KHI NHẬN HÀNG:</h3>
        <ol style="margin: 10px 0; padding-left: 20px;">
          <li><strong>Kiểm tra kỹ hàng hóa</strong> trước khi ký nhận</li>
          <li><strong>Quay video</strong> trong quá trình mở hàng</li>
          <li><strong>Chỉ chấp nhận đổi trả/hoàn hàng</strong> khi có video đối chứng rõ ràng</li>
        </ol>
        <p style="color: #92400e; margin-top: 10px;">📹 Video là bằng chứng duy nhất để xử lý khiếu nại về hàng hóa!</p>
      </div>

      <p>Nếu có bất kỳ vấn đề gì, vui lòng liên hệ ngay với chúng tôi để được hỗ trợ kịp thời.</p>
    </div>
    <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
      <p>Trân trọng,<br><strong>AHSO Industrial</strong></p>
    </div>
  </div>
</body>
</html>
  `;

  return {
    subject: EMAIL_CONFIG.TEMPLATES.ORDER_SHIPPED.subject(orderCode),
    text,
    html,
  };
}

// 5️⃣ Email thông báo đơn hàng bị hủy
export function generateOrderCancelledEmail(orderCode: string, customerName: string, reason?: string) {
  const text = `
Xin chào ${customerName},

Đơn hàng ${orderCode} của bạn đã bị hủy. ❌

${reason ? `Lý do: ${reason}` : ""}

Nếu bạn không yêu cầu hủy đơn hoặc có thắc mắc, vui lòng liên hệ với chúng tôi ngay.

Trân trọng,
AHSO Industrial
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .cancel { background: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Đơn hàng đã bị hủy</h1>
    </div>
    <div class="content">
      <p>Xin chào <strong>${customerName}</strong>,</p>
      
      <div class="cancel">
        <h3>Đơn hàng <strong>${orderCode}</strong> đã bị hủy</h3>
        ${reason ? `<p><strong>Lý do:</strong> ${reason}</p>` : ""}
      </div>

      <p>Nếu bạn không yêu cầu hủy đơn hoặc có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi ngay để được hỗ trợ.</p>
      
      <p style="margin-top: 20px;">Chúng tôi rất tiếc vì sự bất tiện này.</p>
    </div>
    <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 14px;">
      <p>Trân trọng,<br><strong>AHSO Industrial</strong></p>
    </div>
  </div>
</body>
</html>
  `;

  return {
    subject: EMAIL_CONFIG.TEMPLATES.ORDER_CANCELLED.subject(orderCode),
    text,
    html,
  };
}