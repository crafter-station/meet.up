"use client";

import type { FileFeedItem } from "@/components/video-call/types";
import { Download, File, FileText, Image } from "lucide-react";

interface FileCardProps {
	item: FileFeedItem;
}

interface FileMetadata {
	fileUrl: string;
	fileName: string;
	fileSize: number;
	fileType: string;
}

function parseMetadata(raw?: string): FileMetadata | null {
	if (!raw) return null;
	try {
		return JSON.parse(raw) as FileMetadata;
	} catch {
		return null;
	}
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ fileType }: { fileType: string }) {
	if (fileType.startsWith("image/"))
		return <Image className="h-3.5 w-3.5 text-blue-400" />;
	if (fileType === "application/pdf")
		return <FileText className="h-3.5 w-3.5 text-red-400" />;
	return <File className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function FileCard({ item }: FileCardProps) {
	const meta = parseMetadata(item.metadata);
	if (!meta) return null;

	const isImage = meta.fileType.startsWith("image/");

	return (
		<div className="rounded-lg border border-border/40 bg-muted/10 px-3 py-2">
			<div className="flex items-center gap-1.5 mb-1.5">
				<FileIcon fileType={meta.fileType} />
				<span className="text-[10px] text-muted-foreground/60">
					{item.username} — file
				</span>
			</div>

			{isImage && (
				<a
					href={meta.fileUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="block mb-1.5"
				>
					<img
						src={meta.fileUrl}
						alt={meta.fileName}
						className="max-h-48 w-auto rounded-md object-cover"
						loading="lazy"
					/>
				</a>
			)}

			<a
				href={meta.fileUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-center gap-2 group"
			>
				{!isImage && <FileIcon fileType={meta.fileType} />}
				<span className="text-[13px] text-foreground/80 group-hover:text-foreground truncate flex-1">
					{meta.fileName}
				</span>
				<span className="text-[10px] text-muted-foreground/50 shrink-0">
					{formatFileSize(meta.fileSize)}
				</span>
				<Download className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
			</a>
		</div>
	);
}
