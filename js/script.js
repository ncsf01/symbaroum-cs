// DOMContentLoaded = só roda depois que o HTML termina de carregar
document.addEventListener("DOMContentLoaded", () => {
  setupXpCalculation();
  setupAttributeCalculations();
  setupArmor();
  setupToughnessButtons();
  setupCorruptionButtons();
  setupRandomizeButton();
  setupAbilities();
  setupWeapons();
  setupTraits();
  setupCompanions();
  setupCompendiumPanel();
  setupRuleModal();
});

/* ============================
   XP disponível = total - spent
   ============================ */
function setupXpCalculation() {
  // Busca os tres campos que participam do calculo de XP.
  const totalInput = document.getElementById("charXpTotal");
  const spentInput = document.getElementById("charXpSpent");
  const availableInput = document.getElementById("charXpAvailable");

  function recalculate() {
    // Converte o texto dos inputs em numeros; campos vazios viram zero.
    const total = parseInt(totalInput.value, 10) || 0; // || 0 = fallback se o campo estiver vazio/inválido
    const spent = parseInt(spentInput.value, 10) || 0;
    availableInput.value = total - spent;
  }

  // Recalcula imediatamente enquanto o usuario digita em qualquer dos dois campos.
  totalInput.addEventListener("input", recalculate);
  spentInput.addEventListener("input", recalculate);
  recalculate(); // roda uma vez no load, pro valor já aparecer certo
}

/* ==================================================
   Atributos → Combat Statistics (fórmulas do livro)
   ================================================== */
  function recalculateCombatStats() {
    // data-attr identifica qual atributo cada input representa.
    // monta um objeto tipo { acc: 10, cun: 10, ... } a partir de data-attr de cada input
    const attributeInputs = document.querySelectorAll(".attr-input");
    const values = {};
    attributeInputs.forEach((input) => {
      values[input.dataset.attr] = parseInt(input.value, 10) || 0;
    });

    // Estas formulas transformam atributos em estatisticas derivadas.
    const toughness = Math.max(values.str, 10);          // Strong, mín. 10
    const painThreshold = Math.ceil(values.str / 2);      // Strong/2, cima
    const corruptionThreshold = Math.ceil(values.res / 2);// Resolute/2, cima

  // impeding vem do campo da armadura (numero negativo, ex: -3).
  // se o campo "não existir" por algum motivo, cai pra 0 (sem penalidade).
  const armorImpeding = parseInt(document.getElementById("armorImpeding")?.value, 10) || 0;
  const defense = values.qui + armorImpeding;           // Quick + Impeding (que já é negativo)
  const initiative = values.qui;                        // = Quick

    // .textContent altera o texto dos spans; .value seria usado em inputs.
    document.getElementById("statToughness").textContent = toughness;
    document.getElementById("statPainThreshold").textContent = painThreshold;
    document.getElementById("statDefense").textContent = defense;
    document.getElementById("statCorruptionThreshold").textContent = corruptionThreshold;
    document.getElementById("statInitiative").textContent = initiative;

    updateToughnessTracker(toughness);
    updateCorruptionTracker(values.res, corruptionThreshold);
  }

function setupAttributeCalculations() {
  // Toda alteracao de atributo atualiza as estatisticas relacionadas.
  const attributeInputs = document.querySelectorAll(".attr-input");
  attributeInputs.forEach((input) => input.addEventListener("input", recalculateCombatStats));
  recalculateCombatStats(); // roda uma vez no load
}

function setupArmor() {
  document.getElementById("armorImpeding").addEventListener("input", recalculateCombatStats);
}

/* ================================================
   Current Toughness — HP controlado pelo jogador,
   cor muda de saudável → ferido → crítico (sangue)
   ================================================ */
// Estado mutavel: representa a Toughness atual, independente da maxima.
let currentToughness = 10;
// Evita o pop-up abrir de novo a cada clique enquanto o personagem seguir em 0;
// só reabre depois que a Toughness voltar a subir e cair a 0 outra vez.
let toughnessAlertShown = false;

function updateToughnessTracker(max) {
  // Atualiza numeros, largura da barra e classe visual do estado da vida.
  if (currentToughness > max) currentToughness = max; // impede atual > maxima

  document.getElementById("toughnessCurrent").textContent = currentToughness;
  document.getElementById("toughnessMaxEcho").textContent = max;

  // O operador ternario evita uma divisao invalida se max for zero.
  const percent = max > 0 ? (currentToughness / max) * 100 : 0;
  const bar = document.getElementById("toughnessBar");

  // width e uma propriedade CSS, por isso o numero precisa terminar em "%".
  bar.style.width = percent + "%";

  // Classifica em 3 faixas e troca a classe de cor da propria barra.
  bar.classList.remove("tough-healthy", "tough-wounded", "tough-critical");

  if (percent > 60) {
    bar.classList.add("tough-healthy");
  } else if (percent > 25) {
    bar.classList.add("tough-wounded");
  } else {
    bar.classList.add("tough-critical");
  }

  // Regra do livro (Dying Characters): ao chegar a 0 Toughness o personagem
  // colapsa e passa a fazer um Death Test por turno até estabilizar.
  if (currentToughness <= 0) {
    if (!toughnessAlertShown) {
      toughnessAlertShown = true;
      showRuleModal(
        "0 Toughness — Dying",
        "The character collapses and is considered to be dying. Each turn, " +
        "the player rolls a Death Test (1D20) on the character's Initiative: " +
        "1 = wakes up with 1D4 Toughness; 2–19 = remains at death's threshold " +
        "(three of these in a row also means death); 20 = the character dies. " +
        "Stabilizing with an herbal cure, the Medicus ability, or mystical " +
        "healing stops the test."
      );
    }
  } else {
    toughnessAlertShown = false; // volta a poder alertar se cair a 0 de novo depois
  }
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

/* =========
   Corrupção
   ========= */
let temporaryCorruption = 0;
let permanentCorruption = 0;
let lastResolute = 10;
let lastThreshold = 5;

function setupCorruptionButtons() {
  const tempMinus = document.getElementById("tempCorrMinus");
  const tempPlus = document.getElementById("tempCorrPlus");
  const permMinus = document.getElementById("permCorrMinus");
  const permPlus = document.getElementById("permCorrPlus");

  tempMinus.addEventListener("click", () => {
    if (temporaryCorruption > 0) {
      temporaryCorruption -= 1;
      updateCorruptionTracker(lastResolute, lastThreshold);
    }
  });

  tempPlus.addEventListener("click", () => {
    if (temporaryCorruption + permanentCorruption < lastResolute) {
      temporaryCorruption += 1;
      updateCorruptionTracker(lastResolute, lastThreshold);
    }
  });

  permMinus.addEventListener("click", () => {
    if (permanentCorruption > 0) {
      permanentCorruption -= 1;
      updateCorruptionTracker(lastResolute, lastThreshold);
    }
  });

  permPlus.addEventListener("click", () => {
  if (temporaryCorruption + permanentCorruption < lastResolute) {
    permanentCorruption += 1;
    updateCorruptionTracker(lastResolute, lastThreshold);
    }
  });
}

let corruptionAlertShown = false;

function updateCorruptionTracker(resolute, threshold) {
  lastResolute = resolute;
  lastThreshold = threshold;

  document.getElementById("tempCorrValue").textContent = temporaryCorruption;
  document.getElementById("permCorrValue").textContent = permanentCorruption;

  const total = temporaryCorruption + permanentCorruption;
  const scale = resolute > 0 ? resolute : 1; // evita divisão por zero

  document.getElementById("corrTotalValue").textContent = total;
  document.getElementById("corrMaxValue").textContent = resolute;

  const permPercent = Math.min((permanentCorruption / scale) * 100, 100);
  const tempPercent = Math.min((temporaryCorruption / scale) * 100, 100 - permPercent);

  const permBar = document.getElementById("permCorrBar");
  const tempBar = document.getElementById("tempCorrBar");
  permBar.style.left = "0%";
  permBar.style.width = permPercent + "%";
  tempBar.style.left = permPercent + "%";
  tempBar.style.width = tempPercent + "%";

  const thresholdPercent = Math.min((threshold / scale) * 100, 100);
  document.getElementById("corrThresholdMarker").style.left = thresholdPercent + "%";

  const statusEl = document.getElementById("corrStatus");
  let statusText;
  let isDanger = false;

  if (total >= resolute) {
    statusText = "Abomination risk!";
    isDanger = true;
  } else if (total >= threshold) {
    statusText = "Blight-marked";
    isDanger = true;
  } else if (total >= 1) {
    statusText = "Blight-stricken";
  } else {
    statusText = "Untainted";
  }

  statusEl.textContent = statusText;
  statusEl.classList.toggle("corr-status-danger", isDanger);

  if (total >= resolute) {
    if (!corruptionAlertShown) {
      corruptionAlertShown = true;
      showRuleModal(
        "Corruption reaches Resolute — Abomination",
        "Total Corruption!" +
        "The character turns into an Abomination and becomes " +
        "a non-player character. No known ritual can save them."
      );
    }
  } else {
    corruptionAlertShown = false;
  }
}

/* ===========================================
   Random Character — distribui 5·7·9·10·10·11·13·15
   =========================================== */
function setupRandomizeButton() {
  // Distribui os valores padrao aleatoriamente entre os oito atributos.
  const btn = document.getElementById("randomizeAttrs");
  const attributeInputs = document.querySelectorAll(".attr-input");
  const typicalValues = [5, 7, 9, 10, 10, 11, 13, 15];

  btn.addEventListener("click", () => {
    const shuffled = shuffleArray([...typicalValues]);

    attributeInputs.forEach((input, i) => {
      // o indice associa cada valor embaralhado a um input diferente.
      input.value = shuffled[i];
      input.dispatchEvent(new Event("input"));
    });
  });
}

// Fisher-Yates: percorre de trás pra frente, troca cada posição com uma sorteada antes dela
function shuffleArray(array) {
  // retorna a propria array recebida, depois de embaralha-la.
  for (let i = array.length - 1; i > 0; i--) {
    // escolhe uma posicao valida entre zero e i.
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/* ================================================
   Abilities & Powers — lista dinâmica (add/remove)
   ================================================ */

// contador só pra gerar um id único (name="ability-level-N") em cada <select>,
// não tem relação com quantidade de habilidades salvas
// gera identificadores numericos unicos para futuras linhas de habilidade.
let abilityRowCount = 0;

function setupAbilities() {
  
}

/* ================================================
   Painel lateral "+ Ability" — aba fixa que desliza
   um formulario de fora da tela pra dentro
   ================================================ */
function setupCompendiumPanel() {
  const panel = document.getElementById("panelCompendium");
  const tab = document.getElementById("openCompendiumTab");
  const backdrop = document.getElementById("compendiumBackdrop");
  const closeBtn = document.getElementById("closeCompendiumBtn");

  function openPanel() {
    panel.classList.add("open");
    backdrop.classList.remove("d-none");
  }
  function closePanel() {
    panel.classList.remove("open");
    backdrop.classList.add("d-none");
  }

  tab.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", closePanel);
  backdrop.addEventListener("click", closePanel); // clicar fora do painel tambem fecha

  document.getElementById("submitNewAbility").addEventListener("click", () => {
    const level = document.getElementById("newAbilityLevel").value;
    const nameInput = document.getElementById("newAbilityName");
    const descInput = document.getElementById("newAbilityDesc");

    const name = nameInput.value.trim();
    if (!name) return;

    addAbilityRow(name, level, descInput.value.trim());

    nameInput.value = "";
    descInput.value = "";
    nameInput.focus();
  });
}

function addAbilityRow(name = "", level = "novice", description = "") {
  abilityRowCount += 1;
  const rowId = abilityRowCount;

  const wrapper = document.createElement("div");
  wrapper.className = "ability-row";
  wrapper.dataset.level = level; // é isso que o css [data-level="..."] lê pra colorir a borda

  wrapper.innerHTML = `
    <div class="ability-row-header">
      <select class="ability-level-select" data-role="level">
        <option value="novice">Novice</option>
        <option value="adept">Adept</option>
        <option value="master">Master</option>
      </select>
      <input type="text" class="field-input ability-name-input" data-role="name"
             placeholder="Ability name..." value="${name}">
      <button type="button" class="ability-remove-btn" title="Remove">×</button>
    </div>
    <input type="text" class="field-input ability-desc-input" data-role="description"
           placeholder="Short effect description..." value="${description}">
  `;

  // Define no select a opcao correspondente ao nivel recebido.
  wrapper.querySelector('[data-role="level"]').value = level;

  // O data-level muda ao vivo; o css usa esse atributo para trocar a borda.
  wrapper.querySelector('[data-role="level"]').addEventListener("change", (event) => {
    wrapper.dataset.level = event.target.value;
  });

  // o botao remove somente esta linha; confirm() evita apagar por clique
  wrapper.querySelector(".ability-remove-btn").addEventListener("click", () => {
    const currentName = wrapper.querySelector('[data-role="name"]').value || "this ability";
    if (confirm(`Remove "${currentName}"?`)) {
      wrapper.remove();
    }
  });

  // Insere a linha no container da lista e devolve o elemento criado.
  document.getElementById("abilitiesList").appendChild(wrapper);
  return wrapper; // permite reutilizar a funcao para dados do compendio
}

/* ================================================
   Pop-up de regras — reutilizado pro 0 Toughness e
   pra Corrupcao no maximo (ver as duas chamadas de
   showRuleModal mais acima no arquivo)
   ================================================ */
function setupRuleModal() {
  document.getElementById("ruleModalClose").addEventListener("click", () => {
    document.getElementById("ruleModalBackdrop").classList.add("d-none");
  });
}

function showRuleModal(title, message) {
  document.getElementById("ruleModalTitle").textContent = title;
  document.getElementById("ruleModalText").textContent = message;
  document.getElementById("ruleModalBackdrop").classList.remove("d-none");
}

/* ================================================
   Weapons — lista dinamica compacta (nome, dano, qualidade)
   ================================================ */
function setupWeapons() {
  document.getElementById("addWeaponBtn").addEventListener("click", () => addWeaponRow());
}

function addWeaponRow(name = "", damage = "", quality = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "weapon-row";

  wrapper.innerHTML = `
    <input type="text" class="field-input" data-role="name" placeholder="Name..." value="${name}">
    <input type="text" class="field-input text-center" data-role="damage" placeholder="1D8" value="${damage}">
    <input type="text" class="field-input" data-role="quality" placeholder="Quality..." value="${quality}">
    <button type="button" class="ability-remove-btn" title="Remove">×</button>
  `;

  wrapper.querySelector(".ability-remove-btn").addEventListener("click", () => {
    const currentName = wrapper.querySelector('[data-role="name"]').value || "this weapon";
    if (confirm(`Remove "${currentName}"?`)) wrapper.remove();
  });

  document.getElementById("weaponsList").appendChild(wrapper);
  return wrapper;
}

/* ================================================
   Traits & Racial Abilities — igual as habilidades,
   mas sem o seletor de nivel
   ================================================ */
function setupTraits() {
  document.getElementById("addTraitBtn").addEventListener("click", () => addTraitRow());
}

function addTraitRow(name = "", description = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "ability-row"; // reaproveita o mesmo visual de card das abilities

  wrapper.innerHTML = `
    <div class="ability-row-header">
      <input type="text" class="field-input ability-name-input" data-role="name"
             placeholder="Trait name..." value="${name}">
      <button type="button" class="ability-remove-btn" title="Remove">×</button>
    </div>
    <input type="text" class="field-input ability-desc-input" data-role="description"
           placeholder="Short description..." value="${description}">
  `;

  wrapper.querySelector(".ability-remove-btn").addEventListener("click", () => {
    const currentName = wrapper.querySelector('[data-role="name"]').value || "this trait";
    if (confirm(`Remove "${currentName}"?`)) wrapper.remove();
  });

  document.getElementById("traitsList").appendChild(wrapper);
  return wrapper;
}

/* ================================================
   Friends & Companions — mini-tabela (nome, raça, ocupação, jogador)
   ================================================ */
function setupCompanions() {
  document.getElementById("addCompanionBtn").addEventListener("click", () => addCompanionRow());
}

function addCompanionRow(name = "", race = "", occupation = "", player = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "companion-row";

  wrapper.innerHTML = `
    <input type="text" class="field-input" data-role="name" placeholder="Name..." value="${name}">
    <input type="text" class="field-input" data-role="race" placeholder="Race..." value="${race}">
    <input type="text" class="field-input" data-role="occupation" placeholder="Occupation..." value="${occupation}">
    <input type="text" class="field-input" data-role="player" placeholder="Player..." value="${player}">
    <button type="button" class="ability-remove-btn" title="Remove">×</button>
  `;

  wrapper.querySelector(".ability-remove-btn").addEventListener("click", () => {
    const currentName = wrapper.querySelector('[data-role="name"]').value || "this companion";
    if (confirm(`Remove "${currentName}"?`)) wrapper.remove();
  });

  document.getElementById("companionsList").appendChild(wrapper);
  return wrapper;
}
