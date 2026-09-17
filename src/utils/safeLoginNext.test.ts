import { safeLoginNext } from "./safeLoginNext";
test("login resumes exhibition/account flows without external redirects",()=>{
  expect(safeLoginNext('/exhibitions/abc-123')).toBe('/exhibitions/abc-123');
  expect(safeLoginNext('/mypage/exhibitions')).toBe('/mypage/exhibitions');
  expect(safeLoginNext('/workspaces')).toBe('/workspaces');
  for(const value of ['//evil.test','https://evil.test','/\\evil.test','/exhibitions/../signin','/exhibitions/a?redirect=https://evil.test',null]) expect(safeLoginNext(value)).toBe('/');
});
