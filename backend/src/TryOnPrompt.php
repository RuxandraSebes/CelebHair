<?php

declare(strict_types=1);

namespace CelebHair;

final class TryOnPrompt
{
    /**
     * The selfie is always sent as the first image and the inspiration photo as the second.
     */
    public static function build(bool $keepHairColor, string $notes = ''): string
    {
        $color = $keepHairColor
            ? "Keep the hair colour of the person in the FIRST image; take only the cut, length, shape, texture, volume, parting, fringe/bangs and styling from the SECOND image."
            : "Match the cut, length, shape, texture, volume, parting, fringe/bangs, styling AND hair colour from the SECOND image.";

        $prompt = <<<TXT
        You are a professional hairstylist doing a photorealistic virtual hairstyle try-on.

        The FIRST image is a selfie of the client. The SECOND image is a hairstyle inspiration photo.

        Edit the FIRST image so the client is wearing the hairstyle shown in the SECOND image.
        {$color}

        Strict rules:
        - Keep the client's face, identity, facial features, skin tone, makeup, expression, head pose, clothing, background and lighting exactly as in the FIRST image.
        - Do not copy the face or any other feature of the person in the SECOND image. Only the hair transfers.
        - Adapt the hairstyle naturally to the client's head shape, hairline and the camera angle, with realistic strands, shadows and lighting that match the selfie.
        - Keep the same framing and aspect ratio as the FIRST image.
        - Output a single photorealistic image, with no text, borders or side-by-side comparison.
        TXT;

        $notes = trim($notes);
        if ($notes !== '') {
            $prompt .= "\n\nExtra request from the client: " . mb_substr($notes, 0, 300);
        }

        return $prompt;
    }
}
