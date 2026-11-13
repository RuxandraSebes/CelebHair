<?php

declare(strict_types=1);

namespace CelebHair;

/** A validated image from a multipart upload. */
final class UploadedImage
{
    private const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    private function __construct(
        public readonly string $bytes,
        public readonly string $mimeType,
    ) {
    }

    public static function fromUpload(string $field): self
    {
        $file = $_FILES[$field] ?? null;
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            throw new HttpError(400, "Missing image: {$field}");
        }
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new HttpError(400, "Upload of {$field} failed (code {$file['error']}).");
        }

        $maxBytes = (int) Config::get('MAX_UPLOAD_MB', '10') * 1024 * 1024;
        if ($file['size'] > $maxBytes) {
            throw new HttpError(413, "{$field} is larger than " . Config::get('MAX_UPLOAD_MB', '10') . ' MB.');
        }

        $bytes = (string) file_get_contents($file['tmp_name']);
        $mimeType = (new \finfo(FILEINFO_MIME_TYPE))->buffer($bytes) ?: '';
        if (!in_array($mimeType, self::ALLOWED_TYPES, true) || @getimagesizefromstring($bytes) === false) {
            throw new HttpError(415, "{$field} must be a JPEG, PNG or WebP image.");
        }

        return new self($bytes, $mimeType);
    }

    public function base64(): string
    {
        return base64_encode($this->bytes);
    }

    public function extension(): string
    {
        return match ($this->mimeType) {
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'jpg',
        };
    }
}
