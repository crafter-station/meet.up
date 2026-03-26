import { redis } from "@/lib/redis";

export interface EmailRecord {
	id: string;
	roomId: string;
	to: string;
	subject: string;
	htmlBody: string;
	sentAt: string;
	resendId?: string;
}

export interface EmailRepository {
	save(record: EmailRecord): Promise<void>;
	findByRoom(roomId: string): Promise<EmailRecord[]>;
	findById(id: string): Promise<EmailRecord | null>;
}

class RedisEmailRepository implements EmailRepository {
	async save(record: EmailRecord): Promise<void> {
		const pipeline = redis.pipeline();
		pipeline.set(`email:${record.id}`, JSON.stringify(record));
		pipeline.sadd(`room-emails:${record.roomId}`, record.id);
		await pipeline.exec();
	}

	async findByRoom(roomId: string): Promise<EmailRecord[]> {
		const ids = await redis.smembers(`room-emails:${roomId}`);
		if (ids.length === 0) return [];

		const values = await redis.mget(ids.map((id) => `email:${id}`));
		return values
			.filter((v): v is string => v !== null)
			.map((v) => JSON.parse(v) as EmailRecord);
	}

	async findById(id: string): Promise<EmailRecord | null> {
		const value = await redis.get(`email:${id}`);
		if (!value) return null;
		return JSON.parse(value) as EmailRecord;
	}
}

export const emailRepository: EmailRepository = new RedisEmailRepository();
