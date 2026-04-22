import { createServerFn } from "@tanstack/react-start";
import { tmdbGet, omdbGet } from "./movie-api.server";

export const tmdbProxy = createServerFn({ method: "POST" })
  .inputValidator((input: { path: string; params?: Record<string, string> }) => input)
  .handler(async ({ data }) => {
    return tmdbGet(data.path, data.params || {});
  });

export const omdbProxy = createServerFn({ method: "POST" })
  .inputValidator((input: { params: Record<string, string> }) => input)
  .handler(async ({ data }) => {
    return omdbGet(data.params);
  });
