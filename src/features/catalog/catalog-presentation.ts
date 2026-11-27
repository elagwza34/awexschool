import { getSubject, stages } from "./mock-data";

export function stagePresentation(stage: { id: string; name: string }) {
  const artwork = stages.find(({ id }) => id === stage.id);
  return { ...stage, tone: artwork?.tone ?? "mint", description: artwork?.description ?? "" } as const;
}

export function subjectPresentation(subject: { id: string; name: string }) {
  const artwork = getSubject(subject.id);
  return {
    ...subject, tone: artwork?.tone ?? "mint",
    symbol: artwork?.symbol ?? subject.name.charAt(0), description: artwork?.description ?? "",
  } as const;
}
