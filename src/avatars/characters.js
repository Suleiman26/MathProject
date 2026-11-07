/* The 3D characters a student can be. Models are made by the pipeline in /avatars
   (see avatars/README.md) and live in public/avatars/3d. Each model has the clips
   listed in MOTIONS (names must match avatars/pipeline/motions.py). */
export const CHARACTERS = {
  boy: { id: "boy", label: "בן", src: "/avatars/3d/boy.glb" },
  girl: { id: "girl", label: "בת", src: "/avatars/3d/girl.glb" },
};

// "loop" clips play all the time; "once" clips play over it and then hand back
export const MOTIONS = {
  Idle: { loop: true },
  Wave: { once: true },
};
