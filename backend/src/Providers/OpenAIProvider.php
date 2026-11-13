<?php

declare(strict_types=1);

namespace CelebHair\Providers;

use CelebHair\HttpError;
use CelebHair\UploadedImage;

/** OpenAI GPT Image via the /v1/images/edits endpoint (multiple input images). */
final class OpenAIProvider implements HairProvider
{
    public function __construct(
        private readonly string $apiKey,
        private readonly string $model,
        private readonly string $inputFidelity,
        private readonly string $quality,
    ) {
    }

    public function name(): string
    {
        return "OpenAI ({$this->model})";
    }

    public function tryOn(UploadedImage $selfie, UploadedImage $inspiration, string $prompt): array
    {
        $boundary = '----celebhair' . bin2hex(random_bytes(12));
        $fields = ['model' => $this->model, 'prompt' => $prompt, 'size' => 'auto', 'n' => '1'];
        if ($this->inputFidelity !== '') {
            $fields['input_fidelity'] = $this->inputFidelity;
        }
        if ($this->quality !== '') {
            $fields['quality'] = $this->quality;
        }

        $body = '';
        foreach ($fields as $name => $value) {
            $body .= "--{$boundary}\r\nContent-Disposition: form-data; name=\"{$name}\"\r\n\r\n{$value}\r\n";
        }
        foreach (['selfie' => $selfie, 'inspiration' => $inspiration] as $label => $image) {
            $filename = "{$label}.{$image->extension()}";
            $body .= "--{$boundary}\r\n"
                . "Content-Disposition: form-data; name=\"image[]\"; filename=\"{$filename}\"\r\n"
                . "Content-Type: {$image->mimeType}\r\n\r\n"
                . $image->bytes . "\r\n";
        }
        $body .= "--{$boundary}--\r\n";

        $json = HttpClient::post(
            'https://api.openai.com/v1/images/edits',
            $body,
            ['Content-Type: multipart/form-data; boundary=' . $boundary, 'Authorization: Bearer ' . $this->apiKey],
            'OpenAI',
        );

        $b64 = $json['data'][0]['b64_json'] ?? null;
        if (!is_string($b64) || $b64 === '') {
            throw new HttpError(502, "OpenAI didn't return an image. Try a different photo.");
        }

        return ['bytes' => base64_decode($b64), 'mimeType' => 'image/png'];
    }
}
