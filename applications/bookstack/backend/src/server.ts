import "./kernel/clock";
import { createApp } from "./app";
import { openDatabase } from "./kernel/db";

const port = Number(process.env.PORT ?? "3000");
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid PORT");
const host = process.env.HOST || "0.0.0.0";
const db = openDatabase();
const server = createApp(db).listen(port, host, (error?: Error) => {
  if (error) {
    db.close();
    console.error(error);
    process.exitCode = 1;
    return;
  }
  const address = server.address();
  console.log(`Application listening at http://localhost:${typeof address === "object" && address ? address.port : port}`);
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
}
