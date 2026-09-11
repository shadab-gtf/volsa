/** A stable horizon keeps the composition in place while the scene loads. */
export function SeaSceneSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #087bc5 0%, #58b9e7 34%, #c7e6ed 54%, #5d9fba 54.2%, #12638a 67%, #043751 100%)",
      }}
    >
      <div
        className="absolute inset-x-0 top-[18%] h-[22%] -rotate-6 opacity-45"
        style={{
          background:
            "radial-gradient(ellipse at 25% 50%, #fff 0%, transparent 58%), radial-gradient(ellipse at 75% 20%, #fff 0%, transparent 48%)",
          filter: "blur(20px)",
        }}
      />
    </div>
  );
}
