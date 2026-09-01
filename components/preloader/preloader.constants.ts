/**
 * VOLSA Preloader Constants & Timing Configuration
 */

/*
 * The palette is not restated here. It lives once, as custom properties in
 * `app/globals.css`, and the preloader reads it from there.
 */

export const PRELOADER_TIMING = {
  entranceDuration: 0.6,
  counterDuration: 2.2,
  holdDuration: 0.3,
  exitWipeDuration: 0.9,
};

export const EASINGS = {
  entrance: "power3.out",
  counter: "power1.inOut",
  exitWipe: "power2.inOut",
};
