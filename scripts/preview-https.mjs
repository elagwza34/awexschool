import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmdirSync, unlinkSync } from "node:fs";
import { createServer } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import next from "next";

if (process.env.LIVESCHOOL_ENV !== "test" || process.env.NEXT_PUBLIC_LIVESCHOOL_ENV !== "test") {
  throw new Error("The preview HTTPS server requires the isolated test configuration.");
}

const hostname = "127.0.0.1";
const port = 3143;
const directory = mkdtempSync(join(tmpdir(), "liveschool-preview-tls-"));
const key = join(directory, "key.pem");
const cert = join(directory, "cert.pem");
const args = ["req", "-x509", "-newkey", "rsa:2048", "-nodes",
  "-keyout", key, "-out", cert, "-days", "1", "-subj", "/CN=localhost",
  "-addext", "subjectAltName=IP:127.0.0.1,DNS:localhost"];

let issued = spawnSync("openssl", args);
if (process.platform === "win32" && issued.error?.code === "ENOENT" && process.env.ProgramFiles) {
  issued = spawnSync(join(process.env.ProgramFiles, "Git", "usr", "bin", "openssl.exe"), args);
}
if (issued.status !== 0) {
  throw new Error("OpenSSL 1.1.1 or later is required for preview HTTPS.", { cause: issued.error });
}

const tls = { key: readFileSync(key), cert: readFileSync(cert) };
unlinkSync(key);
unlinkSync(cert);
rmdirSync(directory);

const app = next({ dev: false, hostname, port });
await app.prepare();
createServer(tls, app.getRequestHandler()).listen(port, hostname);
