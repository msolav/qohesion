import { defineForm, type Form } from "@qohesion/engine";

/** Question of the development preview. The same engine definition produces real ballots later. */
export const previewBallot: Form = defineForm({
  id: "preview-budget-2027",
  title: { fr: "Adoption du budget 2027", en: "Adoption of the 2027 budget" },
  steps: [
    {
      id: "q1",
      title: { fr: "Question 1", en: "Question 1" },
      questions: [
        {
          id: "choice",
          type: "single",
          required: true,
          label: { fr: "Adoption du budget 2027", en: "Adoption of the 2027 budget" },
          options: [
            { id: "for", label: { fr: "Pour", en: "In favour" } },
            { id: "against", label: { fr: "Contre", en: "Against" } },
            { id: "abstain", label: { fr: "Abstention", en: "Abstention" } },
          ],
        },
      ],
    },
  ],
});
