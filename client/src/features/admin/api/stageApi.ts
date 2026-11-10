import type { StagePhotos } from "@/features/home/stageLayout";
import { api } from "@/lib/api";
import { data, imageForm } from "./shared";

// Le socle de l'accueil (06/11) : la lecture est publique, les écritures sont réservées à l'admin.

const stageApi = api.injectEndpoints({
  endpoints: (build) => ({
    stage: build.query<StagePhotos, void>({
      query: () => "/stage",
      transformResponse: data<StagePhotos>,
      providesTags: ["Stage"],
    }),
    uploadStagePhoto: build.mutation<unknown, { stage: string; slot: string; file: File }>({
      query: ({ stage, slot, file }) => ({
        url: `/admin/stage/${stage}/${slot}/photo`,
        method: "POST",
        body: imageForm(file),
      }),
      invalidatesTags: ["Stage"],
    }),
    deleteStagePhoto: build.mutation<void, { stage: string; slot: string }>({
      query: ({ stage, slot }) => ({ url: `/admin/stage/${stage}/${slot}/photo`, method: "DELETE" }),
      invalidatesTags: ["Stage"],
    }),
    updateStageLabel: build.mutation<void, { stage: string; slot: string; label: string }>({
      query: ({ stage, slot, label }) => ({ url: `/admin/stage/${stage}/${slot}/label`, method: "PATCH", body: { label } }),
      invalidatesTags: ["Stage"],
    }),
    // La disposition réglée à la souris (06/11) ; des valeurs nulles remettent la place de départ.
    saveStageLayout: build.mutation<
      void,
      { stage: string; slots: { slot: string; x: number | null; y: number | null; w: number | null; z: number | null }[] }
    >({
      query: ({ stage, slots }) => ({ url: `/admin/stage/${stage}/layout`, method: "PUT", body: { slots } }),
      invalidatesTags: ["Stage"],
    }),
  }),
});

export const {
  useStageQuery,
  useUploadStagePhotoMutation,
  useDeleteStagePhotoMutation,
  useUpdateStageLabelMutation,
  useSaveStageLayoutMutation,
} = stageApi;
