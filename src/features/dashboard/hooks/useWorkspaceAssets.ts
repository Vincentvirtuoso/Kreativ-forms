"use client";

import { useCallback, useEffect, useState } from "react";

import type { SignatureAsset } from "@/features/assets/domain/signature.types";
import type { HandwritingProfile } from "@/features/handwriting/domain/handwriting-profile.types";

import { signatureService } from "@/features/assets/services/signature.service";
import { handwritingProfileService } from "@/features/handwriting/services/handwriting-profile.service";

interface WorkspaceAssets {
  signatures: SignatureAsset[];
  handwritingProfiles: HandwritingProfile[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useWorkspaceAssets(): WorkspaceAssets {
  const [signatures, setSignatures] = useState<SignatureAsset[]>([]);
  const [handwritingProfiles, setHandwritingProfiles] = useState<
    HandwritingProfile[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [signatureResult, handwritingResult] = await Promise.allSettled([
      signatureService.getAll(),
      handwritingProfileService.getAll(),
    ]);

    if (signatureResult.status === "fulfilled") {
      setSignatures(signatureResult.value);
    }

    if (handwritingResult.status === "fulfilled") {
      setHandwritingProfiles(handwritingResult.value);
    }

    if (
      signatureResult.status === "rejected" ||
      handwritingResult.status === "rejected"
    ) {
      setError("Some workspace assets could not be loaded.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    signatures,
    handwritingProfiles,
    loading,
    error,
    reload,
  };
}
