import { Resend } from "resend";

export interface EmailPayload {
	to: string;
	subject: string;
	html: string;
}

export interface EmailResult {
	id: string;
	success: boolean;
}

export interface EmailService {
	send(payload: EmailPayload): Promise<EmailResult>;
}

class ResendEmailService implements EmailService {
	private client = new Resend(process.env.RESEND_API_KEY!);

	async send(payload: EmailPayload): Promise<EmailResult> {
		const { data, error } = await this.client.emails.send({
			from: "meet.up <onboarding@resend.dev>",
			to: payload.to,
			subject: payload.subject,
			html: payload.html,
		});

		if (error || !data) {
			throw new Error(error?.message ?? "Failed to send email");
		}

		return { id: data.id, success: true };
	}
}

export const emailService: EmailService = new ResendEmailService();
