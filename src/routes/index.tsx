import { createFileRoute } from "@tanstack/react-router";
import MovieClubApp from "@/components/MovieClubApp";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "MovieClub — Discover, Rate & Share Films" },
      { name: "description", content: "Your cinephile social club. Discover trending movies, rate films, and share recommendations with friends." },
    ],
  }),
});

function Index() {
  return <MovieClubApp />;
}
