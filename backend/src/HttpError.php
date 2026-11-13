<?php

declare(strict_types=1);

namespace CelebHair;

/** An error whose message is safe to show to the user. */
final class HttpError extends \RuntimeException
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}
