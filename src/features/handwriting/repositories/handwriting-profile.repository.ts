import type {
  HandwritingProfile,
  HandwritingProfileId,
} from "../domain/handwriting-profile.types";

export interface HandwritingProfileRepository {
  create(profile: HandwritingProfile): Promise<void>;

  getById(id: HandwritingProfileId): Promise<HandwritingProfile | undefined>;

  getAll(): Promise<HandwritingProfile[]>;

  update(
    id: HandwritingProfileId,
    changes: Partial<HandwritingProfile>,
  ): Promise<void>;

  delete(id: HandwritingProfileId): Promise<void>;
}
