import { app } from "./app";
import { env } from "./config/env";

app.listen(env.port, () => {
  console.log(`VISHWAS SILK API listening on http://localhost:${env.port}`);
});
