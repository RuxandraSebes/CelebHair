<?php

declare(strict_types=1);

namespace CelebHair\Providers;

use CelebHair\HttpError;
use CelebHair\UploadedImage;

/** Google Gemini image model ("Nano Banana") via the generateContent REST API. */
final class GeminiProvider implements HairProvider
{
    public function __construct(
        private readonly string $apiKey,
        private readonly string $model,
    ) {
    }

    public function name(): string
    {
        return "Gemini ({$this->model})";
    }

    public function tryOn(UploadedImage $selfie, UploadedImage $inspiration, string $prompt): array
    {
        $body = [
            'contents' => [[
                'role' => 'user',
                'parts' => [
                    ['text' => $prompt],
                    ['inline_data' => ['mime_type' => $selfie->mimeType, 'data' => $selfie->base64()]],
                    ['inline_data' => ['mime_type' => $inspiration->mimeType, 'data' => $inspiration->base64()]],
                ],
            ]],
            'generationConfig' => ['responseModalities' => ['TEXT', 'IMAGE']],
        ];

        $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($this->model) . ':generateContent';
        $json = HttpClient::post(
            $url,
            json_encode($body, JSON_THROW_ON_ERROR),
            ['Content-Type: application/json', 'x-goog-api-key: ' . $this->apiKey],
            'Gemini',
        );

        $text = '';
        foreach ($json['candidates'][0]['content']['parts'] ?? [] as $part) {
            $inline = $part['inlineData'] ?? $part['inline_data'] ?? null;
            if (is_array($inline) && !empty($inline['data'])) {
                return [
                    'bytes' => base64_decode($inline['data']),
                    'mimeType' => $inline['mimeType'] ?? $inline['mime_type'] ?? 'image/png',
                ];
            }
            $text .= $part['text'] ?? '';
        }

        $reason = $json['candidates'][0]['finishReason'] ?? $json['promptFeedback']['blockReason'] ?? null;
        $detail = trim($text) !== '' ? trim($text) : ($reason ? "finish reason: {$reason}" : 'no image returned');
        throw new HttpError(502, "Gemini didn't return an image ({$detail}). Try a different photo.");
    }
}
