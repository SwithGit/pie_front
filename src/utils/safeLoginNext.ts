// Only known internal destinations can be used after password/social login.
export function safeLoginNext(value: string | null): string {
  if (!value) return "/";
  if (["/", "/workspaces", "/mypage/exhibitions", "/mypage/creator", "/mypage/publications"].includes(value)) return value;
  if (/^\/exhibitions\/[A-Za-z0-9_-]{1,45}$/.test(value)) return value;
  return "/";
}
