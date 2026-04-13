import { createServerFn } from "@tanstack/react-start";
import { tmdbGet, omdbGet, streamingGet } from "./movie-api.server";

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

export const streamingProxy = createServerFn({ method: "POST" })
  .inputValidator((input: { tmdbId: number; country?: string }) => input)
  .handler(async ({ data }) => {
    return streamingGet(data.tmdbId, data.country || "br");
  });
