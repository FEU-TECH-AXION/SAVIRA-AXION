"use client";

import Image from "next/image";
import {
  FiExternalLink,
  FiFile,
  FiFileText,
  FiImage,
  FiVideo,
} from "react-icons/fi";
import styles from "./EvidenceGallery.module.css";

function getEvidenceKind(evidence) {
  const type = String(evidence?.evidence_type || "").toLowerCase();
  const name = String(evidence?.original_name || evidence?.file_path || "").toLowerCase();
  if (type === "photo" || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return "image";
  if (type === "video" || /\.(mp4|mov|avi|webm|mkv)$/.test(name)) return "video";
  if (type === "document" || /\.(pdf|docx?|txt|rtf|odt)$/.test(name)) return "document";
  return "file";
}

function EvidenceIcon({ kind }) {
  if (kind === "image") return <FiImage />;
  if (kind === "video") return <FiVideo />;
  if (kind === "document") return <FiFileText />;
  return <FiFile />;
}

function formatEvidenceType(kind) {
  if (kind === "image") return "Image";
  if (kind === "video") return "Video";
  if (kind === "document") return "Document";
  return "File";
}

function formatUploadedAt(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function EvidenceGallery({ evidences = [] }) {
  if (!evidences.length) {
    return <p className={styles.empty}>No evidence files submitted.</p>;
  }

  return (
    <div className={styles.gallery}>
      {evidences.map((evidence, index) => {
        const kind = getEvidenceKind(evidence);
        const name = evidence.original_name || `Evidence file ${index + 1}`;
        const uploadedAt = formatUploadedAt(evidence.uploaded_at || evidence.created_at);

        return (
          <article
            key={evidence.id || evidence.evidence_id || evidence.file_path || index}
            className={styles.card}
          >
            <div className={styles.preview}>
              {kind === "image" && evidence.url ? (
                <Image
                  src={evidence.url}
                  alt={`Preview of ${name}`}
                  fill
                  sizes="(max-width: 700px) 100vw, 280px"
                  unoptimized
                />
              ) : (
                <span className={styles.fileIcon} aria-hidden="true">
                  <EvidenceIcon kind={kind} />
                </span>
              )}
            </div>
            <div className={styles.content}>
              <span className={styles.type}>{formatEvidenceType(kind)}</span>
              <p className={styles.name} title={name}>{name}</p>
              {uploadedAt && <p className={styles.meta}>Added {uploadedAt}</p>}
              {evidence.url ? (
                <a
                  href={evidence.url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.openButton}
                >
                  Open evidence <FiExternalLink />
                </a>
              ) : (
                <span className={styles.unavailable}>Preview unavailable</span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
