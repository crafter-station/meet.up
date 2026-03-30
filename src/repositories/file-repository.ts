import * as Minio from "minio";

const minioConfig = {
	endPoint: process.env.MINIO_ENDPOINT || "localhost",
	port: parseInt(process.env.MINIO_PORT || "443"),
	useSSL: process.env.MINIO_USE_SSL === "true",
	accessKey: process.env.MINIO_ACCESS_KEY || "",
	secretKey: process.env.MINIO_SECRET_KEY || "",
};

const minioClient = new Minio.Client(minioConfig);
const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "meetup";

let bucketReady = false;

async function ensureBucket(): Promise<void> {
	if (bucketReady) return;

	const exists = await minioClient.bucketExists(BUCKET_NAME);
	if (!exists) {
		await minioClient.makeBucket(BUCKET_NAME, "us-east-1");

		const publicReadPolicy = {
			Version: "2012-10-17",
			Statement: [
				{
					Effect: "Allow",
					Principal: { AWS: ["*"] },
					Action: ["s3:GetObject"],
					Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
				},
			],
		};

		await minioClient.setBucketPolicy(
			BUCKET_NAME,
			JSON.stringify(publicReadPolicy),
		);
	}

	bucketReady = true;
}

export interface FileRepository {
	upload(
		file: Buffer,
		objectName: string,
		contentType: string,
		size: number,
	): Promise<{ url: string }>;
	getUrl(objectName: string): string;
	delete(objectName: string): Promise<void>;
}

class MinioFileRepository implements FileRepository {
	async upload(
		file: Buffer,
		objectName: string,
		contentType: string,
		size: number,
	): Promise<{ url: string }> {
		await ensureBucket();

		await minioClient.putObject(BUCKET_NAME, objectName, file, size, {
			"Content-Type": contentType,
		});

		return { url: this.getUrl(objectName) };
	}

	getUrl(objectName: string): string {
		if (minioConfig.useSSL) {
			return `https://${minioConfig.endPoint}/${BUCKET_NAME}/${objectName}`;
		}
		return `http://${minioConfig.endPoint}:${minioConfig.port}/${BUCKET_NAME}/${objectName}`;
	}

	async delete(objectName: string): Promise<void> {
		await minioClient.removeObject(BUCKET_NAME, objectName);
	}
}

export function generateObjectName(roomId: string, filename: string): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 9);
	const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
	return `rooms/${roomId}/${timestamp}-${random}-${sanitized}`;
}

export const fileRepository: FileRepository = new MinioFileRepository();
