import { Detail } from "@raycast/api";
import type { ComponentProps } from "react";

type HTMLDetailProps = ComponentProps<typeof Detail> & {
  html?: string | null;
  css?: string | null;
};

export function HTMLDetail({ html, css, ...props }: HTMLDetailProps) {
  return (
    <Detail
      {...props}
      {...({
        html,
        css,
      } as Record<string, unknown>)}
    />
  );
}
