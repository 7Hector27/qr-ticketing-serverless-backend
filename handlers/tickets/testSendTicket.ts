import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import QRCode from "qrcode";
import AWS from "aws-sdk";

const ses = new AWS.SES({ region: "us-east-1" });

export const main: APIGatewayProxyHandlerV2 = async () => {
  try {
    // Example ticketId
    const ticketId = "test-ticket-" + Date.now();
    const qrDataUrl = await QRCode.toDataURL(ticketId);

    // Strip prefix: "data:image/png;base64,..."
    const base64Image = qrDataUrl.split(",")[1];

    // ✅ Build a clean HTML email
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h1 style="color: #333; text-align: center;">Your Ticket is Ready</h1>
        <p style="font-size: 16px; text-align: center;">Show this QR code at the event for entry.</p>
        <div style="text-align: center; margin: 20px 0;">
          <img src="data:image/png;base64,${base64Image}" alt="QR Code" style="width: 200px; height: 200px;" />
        </div>
        <p style="text-align: center; font-size: 14px; color: #555;">Ticket ID: <strong>${ticketId}</strong></p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://your-frontend-domain.com/tickets/${ticketId}" 
             style="background-color: #007bff; color: #fff; padding: 12px 20px; border-radius: 5px; text-decoration: none; font-size: 16px;">
            View Ticket Online
          </a>
        </div>
        <p style="font-size: 12px; text-align: center; color: #999; margin-top: 20px;">
          If you have any issues, please contact support at support@yourapp.com.
        </p>
      </div>
    `;

    // ✅ SES send params
    const params = {
      Source: "Virus_714@yahoo.com", // must be SES-verified
      Destination: {
        ToAddresses: ["Virus_714@yahoo.com"], // must be verified in sandbox
      },
      Message: {
        Subject: { Data: "Your Test QR Ticket" },
        Body: {
          Html: { Data: htmlBody },
        },
      },
    };

    await ses.sendEmail(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Test QR ticket sent!" }),
    };
  } catch (err: any) {
    console.error("Error sending test QR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message }),
    };
  }
};
