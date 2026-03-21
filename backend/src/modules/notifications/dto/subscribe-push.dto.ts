import { IsString, IsNotEmpty, IsOptional, IsUrl, MaxLength } from 'class-validator';

/**
 * Matches the structure produced by browser's PushSubscription.toJSON()
 * flattened for convenience.
 *
 * Browser usage:
 *   const sub = await swReg.pushManager.subscribe({ ... });
 *   const json = sub.toJSON(); // { endpoint, keys: { p256dh, auth } }
 *   fetch('/push-subscriptions', { method: 'POST', body: JSON.stringify({
 *     endpoint: json.endpoint,
 *     p256dh:   json.keys.p256dh,
 *     auth:     json.keys.auth,
 *   }) });
 */
export class SubscribePushDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  @MaxLength(2000)
  endpoint: string;

  /** ECDH public key in Base64url format */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  p256dh: string;

  /** Authentication secret in Base64url format */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  auth: string;

  /** Device information (e.g. user-agent string) */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deviceInfo?: string;
}
