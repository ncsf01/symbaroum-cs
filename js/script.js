document.addEventListener("DOMContentLoaded", () => {
  setupXpCalculation();
  setupAttributeCalculations();
  setupToughnessButtons();
});
function setupXpCalculation() {
  const totalInput = document.getElementById("charXpTotal");
  const spentInput = document.getElementById("charXpSpent");
  const availableInput = document.getElementById("charXpAvailable");
  function recalculate() {
    const total = parseInt(totalInput.value, 10) || 0;
    const spent = parseInt(spentInput.value, 10) || 0;

    availableInput.value = total - spent;
  }
  totalInput.addEventListener("input", recalculate);
  spentInput.addEventListener("input", recalculate);
  recalculate();
}

/* =========================================================
   Atributos → Estatísticas de Combate
   ========================================================= */

function setupAttributeCalculations() {
  const attributeInputs = document.querySelectorAll(".attr-input");

  function recalculateCombatStats() {
    const values = {};
    attributeInputs.forEach((input) => {
      const key = input.dataset.attr;
      values[key] = parseInt(input.value, 10) || 0;
    });

    // ---- Fórmulas oficiais do livro (Secondary Attributes) ----

    // Toughness = Strong, mas nunca menos que 10.
    // Math.max(a, b) devolve o MAIOR dos dois números.
    const toughness = Math.max(values.str, 10);

    // Pain Threshold = Strong ÷ 2, arredondado PRA CIMA.
    // Math.ceil() arredonda sempre pra cima (ceil = "teto").
    const painThreshold = Math.ceil(values.str / 2);

    // Corruption Threshold = Resolute ÷ 2, arredondado pra cima.
    const corruptionThreshold = Math.ceil(values.res / 2);

    // Defense = Quick − Impeding da armadura.
    const armorImpeding = 0;
    const defense = values.qui - armorImpeding;

    // Initiative = o próprio valor de Quick.
    const initiative = values.qui;

    // ---- Agora escrevemos os resultados na tela ----
    // ".textContent" em vez de ".value".
    // porque não são <input>, são <span>
    document.getElementById("statToughness").textContent = toughness;
    document.getElementById("statPainThreshold").textContent = painThreshold;
    document.getElementById("statDefense").textContent = defense;
    document.getElementById("statCorruptionThreshold").textContent = corruptionThreshold;
    document.getElementById("statInitiative").textContent = initiative;

    updateToughnessTracker(toughness);
  }

  // "for each" liga o memso esquema para todos 8 campos de atributo de uma vez
  attributeInputs.forEach((input) => {
    input.addEventListener("input", recalculateCombatStats);
  });

  recalculateCombatStats();
}

/* =========================================================
   Rastreador de Toughness
   =======================================================*/
let currentToughness = 10;

function updateToughnessTracker(max) {
  if (currentToughness > max) {
    currentToughness = max;
  }

  document.getElementById("toughnessCurrent").textContent = currentToughness;
  document.getElementById("toughnessMaxEcho").textContent = max;

  const percent = max > 0 ? (currentToughness / max) * 100 : 0;
  document.getElementById("toughnessBar").style.width = percent + "%";
}

function setupToughnessButtons() {
  const minusBtn = document.getElementById("toughnessMinus");
  const plusBtn = document.getElementById("toughnessPlus");

  minusBtn.addEventListener("click", () => {
    if (currentToughness > 0) {
      currentToughness -= 1;
      const max = parseInt(document.getElementById("statToughness").textContent, 10);
      updateToughnessTracker(max);
    }
  });

  plusBtn.addEventListener("click", () => {
    const max = parseInt(document.getElementById("statToughness").textContent, 10);
    if (currentToughness < max) {
      currentToughness += 1;
      updateToughnessTracker(max);
    }
  });
}
