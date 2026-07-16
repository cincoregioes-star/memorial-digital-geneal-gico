(() => {
  'use strict';
  const people = window.FAMILIA || [];
  const surnames = window.SOBRENOMES || [];
  const coats = window.BRASOES_GALLERY || [];
  const CONTACT_EMAIL = 'cincoregioes@gmail.com';
  const byId = Object.fromEntries(people.map(p => [p.id, p]));
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  let familyNetwork = null;
  let treeMode = 'complete';
  let familyNodes = null;
  let familyEdges = null;
  let neuralNetwork = null;
  let toastTimer = null;

  const branchColors = {
    materna: { background: '#0b6f58', border: '#74efb6', highlight: { background: '#11886d', border: '#d6fff0' } },
    paterna: { background: '#164f83', border: '#72b9ff', highlight: { background: '#246ba9', border: '#e0f1ff' } },
    central: { background: '#725116', border: '#f3cf7a', highlight: { background: '#916b25', border: '#fff1bd' } },
    foco: { background: '#8e5d08', border: '#ffd477', highlight: { background: '#ac7518', border: '#fff4c8' } },
    uniao: { background: '#66367a', border: '#d7a2ff', highlight: { background: '#815096', border: '#f2dfff' } },
    descendente: { background: '#135f5b', border: '#75e5cf', highlight: { background: '#1b7b75', border: '#d8fff8' } },
    'nova-geracao': { background: '#3e732d', border: '#a8f07b', highlight: { background: '#518e3c', border: '#ecffdf' } },
    memoria: { background: '#4c4c5c', border: '#c8c8d4', highlight: { background: '#626276', border: '#ffffff' } }
  };

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
  }

  function personPhoto(p) {
    return p?.photo || `assets/avatars/${p.id}.svg`;
  }

  function esc(v='') {
    return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  }

  function initReveal() {
    const elements = $$('.reveal');
    if (!('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('visible'));
      return;
    }

    // Limiar baixo: elementos altos, como a árvore completa, precisam aparecer
    // mesmo quando apenas uma pequena parte cabe na tela do notebook.
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting || entry.intersectionRatio > 0) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    }), { threshold: 0.01, rootMargin: '0px 0px -3% 0px' });

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) el.classList.add('visible');
      else io.observe(el);
    });

    // Segurança contra bloqueio de animação por navegador, zoom ou cache antigo.
    window.setTimeout(() => elements.forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight * 1.5) el.classList.add('visible');
    }), 900);
  }

  function initButtons() {
    $$('[data-goto]').forEach(btn => btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.goto)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    $('#toggleContrast').addEventListener('click', () => {
      document.body.classList.toggle('high-contrast');
      localStorage.setItem('legado-contrast', document.body.classList.contains('high-contrast') ? '1' : '0');
    });
    if (localStorage.getItem('legado-contrast') === '1') document.body.classList.add('high-contrast');
  }

  function initPoster() {
    const dialog = $('#posterModal');
    $('#openPoster').addEventListener('click', () => dialog.showModal());
    $('#closePoster').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  }

  const neuralItems = [
    { id:'n0', label:'LEGADO\nTAVARES E LIMA', target:'inicio', size:46, group:'core' },
    { id:'n1', label:'Árvore\nGenealógica', target:'arvore', size:34, group:'main' },
    { id:'n2', label:'Linha do\nTempo', target:'linha-do-tempo', size:30, group:'main' },
    { id:'n3', label:'Mapa das\nOrigens', target:'origens', size:30, group:'main' },
    { id:'n4', label:'Memórias\nVivas', target:'memorias', size:30, group:'main' },
    { id:'n5', label:'Vídeos e\nCanais', target:'videos', size:28, group:'media' },
    { id:'n6', label:'Documentos e\nFotografias', target:'documentos', size:28, group:'media' },
    { id:'n7', label:'Questão\nImersiva', target:'desafio', size:28, group:'learning' },
    { id:'n8', label:'Relógio\nBiológico', target:'relogio-biologico', size:28, group:'rest' },
    { id:'n9', label:'Carlos\nAndre', person:'carlos-andre-tavares-lima', size:25, group:'person' },
    { id:'n10', label:'Raízes\nMaternas', target:'arvore', size:22, group:'maternal' },
    { id:'n11', label:'Raízes\nPaternas', target:'arvore', size:22, group:'paternal' },
    { id:'n12', label:'Nova\nGeração', target:'arvore', size:22, group:'future' },
    { id:'n13', label:'Álbum de\nFotografias', target:'album-familia', size:25, group:'media' },
    { id:'n14', label:'Sobrenomes e\nBrasões', target:'sobrenomes', size:25, group:'learning' },
    { id:'n15', label:'Enviar\nContribuição', target:'contribuir', size:24, group:'rest' },
    { id:'n16', label:'Modelo para\noutra família', target:'modelo-memorial', size:24, group:'future' },
    { id:'n17', label:'Família e\nHistória Mundial', target:'historia-mundo', size:27, group:'learning' },
    { id:'n18', label:'Descobertas que\nMudaram a Vida', target:'descobertas-humanas', size:27, group:'future' }
  ];
  const neuralLinks = [['n0','n1'],['n0','n2'],['n0','n3'],['n0','n4'],['n0','n8'],['n1','n10'],['n1','n11'],['n1','n12'],['n4','n5'],['n4','n6'],['n4','n9'],['n4','n7'],['n7','n8'],['n2','n3'],['n5','n6'],['n10','n9'],['n11','n9'],['n9','n12'],['n6','n13'],['n3','n14'],['n4','n15'],['n0','n16'],['n13','n15'],['n14','n16'],['n2','n17'],['n0','n17'],['n17','n3'],['n17','n18'],['n0','n18'],['n18','n4']];

  function neuralFallback() {
    const fallback = $('#neuralFallback');
    fallback.hidden = false;
    $('#neuralNetwork').hidden = true;
    fallback.innerHTML = neuralItems.filter(x => x.id !== 'n0').map(x => `<button type="button" data-target="${esc(x.target || '')}" data-person="${esc(x.person || '')}"><strong>${esc(x.label).replace(/\n/g,' ')}</strong></button>`).join('');
    fallback.addEventListener('click', e => {
      const btn = e.target.closest('button'); if (!btn) return;
      if (btn.dataset.person) openProfile(btn.dataset.person);
      else document.getElementById(btn.dataset.target)?.scrollIntoView({ behavior:'smooth' });
    });
  }

  function initNeuralNetwork() {
    if (!window.vis?.Network) { neuralFallback(); return; }
    const groupStyles = {
      core:{color:{background:'#0f725a',border:'#9affd1'},font:{size:18,color:'#fff',face:'Inter'},borderWidth:2},
      main:{color:{background:'#144c40',border:'#74efb6'},font:{color:'#fff'}},
      media:{color:{background:'#153e63',border:'#72b9ff'},font:{color:'#fff'}},
      learning:{color:{background:'#6c4d12',border:'#f3cf7a'},font:{color:'#fff'}},
      rest:{color:{background:'#3f3768',border:'#d7a2ff'},font:{color:'#fff'}},
      person:{color:{background:'#8e5d08',border:'#ffd477'},font:{color:'#fff'}},
      maternal:{color:{background:'#0c634e',border:'#74efb6'},font:{color:'#fff'}},
      paternal:{color:{background:'#174f82',border:'#72b9ff'},font:{color:'#fff'}},
      future:{color:{background:'#3d702f',border:'#a8f07b'},font:{color:'#fff'}}
    };
    const nodes = new vis.DataSet(neuralItems.map(x => ({ id:x.id,label:x.label,size:x.size,group:x.group,shape:'dot',shadow:{enabled:true,color:'rgba(0,0,0,.42)',size:24,x:0,y:12} })));
    const edges = new vis.DataSet(neuralLinks.map((x,i) => ({ id:'ne'+i,from:x[0],to:x[1],color:{color:'rgba(116,239,182,.25)',highlight:'#f3cf7a'},width:1.3,smooth:{type:'continuous'},shadow:false })));
    neuralNetwork = new vis.Network($('#neuralNetwork'), { nodes, edges }, {
      autoResize:true, groups:groupStyles,
      interaction:{hover:true,tooltipDelay:100,zoomView:true,dragView:true,navigationButtons:false,keyboard:true},
      physics:{enabled:true,solver:'forceAtlas2Based',forceAtlas2Based:{gravitationalConstant:-66,centralGravity:.012,springLength:145,springConstant:.045,damping:.42,avoidOverlap:.5},stabilization:{iterations:170}},
      nodes:{borderWidth:1.5,font:{size:14,face:'Inter',multi:false,strokeWidth:0},scaling:{min:18,max:50}},
      edges:{selectionWidth:2}
    });
    neuralNetwork.once('stabilizationIterationsDone', () => { neuralNetwork.setOptions({ physics:{enabled:false} }); neuralNetwork.fit({ animation:true }); });
    neuralNetwork.on('click', params => {
      if (!params.nodes.length) return;
      const item = neuralItems.find(n => n.id === params.nodes[0]);
      if (item.person) openProfile(item.person);
      else if (item.target) document.getElementById(item.target)?.scrollIntoView({ behavior:'smooth',block:'start' });
    });
    $('#resetNeural').addEventListener('click', () => neuralNetwork.fit({ animation:{duration:700,easingFunction:'easeInOutQuad'} }));
  }

  function buildFamilyData(list = people) {
    const visible = new Set(list.map(p => p.id));
    const nodes = list.map(p => {
      const isCurrentFamily = p.treeEmphasis === 'current';
      const isPreviousUnion = p.treeEmphasis === 'secondary';
      const nodeColor = isCurrentFamily
        ? {background:'#1f7256',border:'#f3cf7a',highlight:{background:'#2b8f6d',border:'#fff1bd'}}
        : isPreviousUnion
          ? {background:'#423548',border:'#9c83a8',highlight:{background:'#57445f',border:'#d8c4e0'}}
          : (branchColors[p.branch] || branchColors.descendente);
      return {
        id:p.id,
        label:p.treeLabel || `${p.short || p.name}${p.birth ? '\n'+p.birth : ''}`,
        title:`${p.name}${p.relationshipPeriod ? ' — '+p.relationshipPeriod : ''}${p.birthPlace ? ' — '+p.birthPlace : ''}`,
        level:p.generation,
        shape:'circularImage',
        image:personPhoto(p),
        brokenImage:'assets/avatars/carlos-andre-tavares-lima.svg',
        color:nodeColor,
        borderWidth:p.branch === 'foco' || isCurrentFamily ? 4 : (isPreviousUnion ? 1 : 2),
        size:p.branch === 'foco' ? 43 : (isCurrentFamily ? 40 : (isPreviousUnion ? 28 : 34)),
        font:{color:isPreviousUnion ? '#d9cedd' : '#effcf6',size:p.branch === 'foco' ? 16 : (isCurrentFamily ? 14 : (isPreviousUnion ? 10 : 13)),face:'Inter',strokeWidth:5,strokeColor:'#03110e',vadjust:isPreviousUnion ? 10 : 7},
        shadow:{enabled:true,color:'rgba(0,0,0,.5)',size:isPreviousUnion ? 10 : 16,x:0,y:8}
      };
    });
    const edgeKeys = new Set();
    const edges = [];
    people.forEach(child => {
      if (!visible.has(child.id)) return;
      child.parents.forEach(parent => {
        if (!visible.has(parent)) return;
        const key = parent+'>'+child.id;
        if (!edgeKeys.has(key)) { edgeKeys.add(key); edges.push({ id:key,from:parent,to:child,arrows:{to:{enabled:true,scaleFactor:.35}},color:{color:'rgba(205,239,225,.28)',highlight:'#f3cf7a'},width:1.6,smooth:{type:'cubicBezier',forceDirection:'vertical',roundness:.35} }); }
      });
    });
    return { nodes, edges };
  }

  function familyFallback(list = people) {
    const fallback = $('#familyFallback');
    fallback.hidden = false;
    $('#familyNetwork').hidden = true;
    fallback.innerHTML = list.map(p => `<button type="button" data-id="${p.id}"><img src="${personPhoto(p)}" alt=""><strong>${esc(p.name)}</strong><small>${esc(p.birth || 'Data em pesquisa')}</small></button>`).join('');
    fallback.onclick = e => { const b=e.target.closest('button'); if(b) openProfile(b.dataset.id); };
  }

  function treeCard(id, extraClass = '', tag = '') {
    const person = byId[id];
    if (!person) return '';
    const meta = [person.birth || 'Data em pesquisa', person.birthPlace || 'Local em pesquisa'].filter(Boolean).join(' • ');
    const classes = ['person-tree-card', person.branch || '', extraClass].filter(Boolean).join(' ');
    return `<button class="${classes}" type="button" data-open-person="${person.id}" data-person-id="${person.id}" data-person-name="${esc(person.name.toLocaleLowerCase('pt-BR'))}" data-person-branch="${esc(person.branch || '')}">
      ${tag ? `<span class="tree-tag">${esc(tag)}</span>` : ''}
      <img src="${esc(personPhoto(person))}" alt="Retrato de ${esc(person.name)}" loading="lazy">
      <strong>${esc(person.name)}</strong>
      <small>${esc(meta)}</small>
    </button>`;
  }

  function pairCards(first, second, firstClass = '', secondClass = '', firstTag = '', secondTag = '') {
    return `<div class="family-pair">${treeCard(first, firstClass, firstTag)}<span class="family-plus" aria-hidden="true">+</span>${treeCard(second, secondClass, secondTag)}</div>`;
  }

  function renderCompleteTree() {
    const directory = people.map(person => treeCard(person.id, person.treeEmphasis === 'current' ? 'current' : person.treeEmphasis === 'secondary' ? 'previous' : '', person.id === 'carlos-andre-tavares-lima' ? 'Indivíduo foco' : '')).join('');
    $('#completeTreeContent').innerHTML = `
      <section class="lineage-panel materna" data-tree-section>
        <header class="lineage-header"><div><span>Origem conhecida</span><h3>Raízes maternas</h3></div><p>A linhagem de Celina e a família Cabral Tavares, chegando até Edir Tavares Cabral.</p></header>
        <div class="lineage-roots">
          <div class="lineage-path"><span class="lineage-path-label">Linha de Celina</span>${treeCard('celina')}<span class="family-arrow">↓</span>${pairCards('manoel-cabral-tavares','argentina')}<span class="family-arrow">↓</span>${treeCard('argeu-cabral-tavares')}</div>
          <div class="lineage-path"><span class="lineage-path-label">Linha da Encarnação</span>${pairCards('joao-sousa-coelho','rosa-maria-encarnacao')}<span class="family-arrow">↓</span>${treeCard('edith-encarnacao-tavares')}</div>
        </div>
        <div class="family-merge"><span class="family-merge-label">As duas linhas se unem</span>${pairCards('argeu-cabral-tavares','edith-encarnacao-tavares')}<span class="family-arrow">↓</span>${treeCard('edir-tavares-lima','central','Mãe de Carlos')}</div>
      </section>

      <section class="lineage-panel paterna" data-tree-section>
        <header class="lineage-header"><div><span>Família Batista de Lima</span><h3>Raízes paternas</h3></div><p>Duas linhas familiares convergem em Antonio Batista Lima e Sebastiana Batista Lima, pais de Cezar Mario.</p></header>
        <div class="lineage-roots">
          <div class="lineage-path"><span class="lineage-path-label">Linha Lima</span>${pairCards('joao-paula-lima','antonia-paula-lima')}<span class="family-arrow">↓</span>${treeCard('antonio-batista-lima')}</div>
          <div class="lineage-path"><span class="lineage-path-label">Linha Brites</span>${pairCards('francisco-costa-brites','maria-costa-brites')}<span class="family-arrow">↓</span>${treeCard('sebastiana-batista-lima')}</div>
        </div>
        <div class="family-merge"><span class="family-merge-label">As duas linhas se unem</span>${pairCards('antonio-batista-lima','sebastiana-batista-lima')}<span class="family-arrow">↓</span>${treeCard('cezar-mario-batista-lima','central','Pai de Carlos')}</div>
      </section>

      <section class="lineage-panel central" data-tree-section>
        <header class="lineage-header"><div><span>Primeira união</span><h3>Cezar Mario e Edir</h3></div><p>Em ordem: Mauro (1969), Marcia (1970), Adriana (1972), Julio (1973), Carlos (1975) e Rogerio (1976).</p></header>
        <div class="central-couple">${pairCards('cezar-mario-batista-lima','edir-tavares-lima','central','central')}</div>
        <span class="family-arrow" style="margin:12px auto">↓</span>
        <div class="siblings-grid">
          ${treeCard('mauro-cezar','memoria','Primogênito • Memória')}
          ${treeCard('marcia-celina-tavares-lima')}
          ${treeCard('adriana-cristina-tavares-lima')}
          ${treeCard('julio-cezar','memoria','4º filho • Memória')}
          ${treeCard('carlos-andre-tavares-lima','foco','Indivíduo foco')}
          ${treeCard('rogerio-tavares-lima')}
        </div>
      </section>


      <section class="lineage-panel second-union" data-tree-section>
        <header class="lineage-header"><div><span>Segunda união de Cezar • 1978</span><h3>Cezar Mario, Joana e Jéssica</h3></div><p>Após a separação de Edir, Cezar casou-se com Joana Xavier de Lima. A filha do casal, Jéssica Lindsey Xavier de Lima, nasceu em 1990 na Mooca, em São Paulo.</p></header>
        <div class="family-core">${pairCards('cezar-mario-batista-lima','joana-xavier-lima','central','second-union','Cezar Mario','Casamento em 1978')}<span class="family-arrow">↓</span>${treeCard('jessiva-lindsey-xavier-lima','second-union','Irmã caçula • 1990')}</div>
        <p class="family-history-note">Segundo o relato familiar registrado por Carlos André, em 1978 Cezar levou os filhos para viver com ele em São Paulo, enquanto Edir permaneceu em Belford Roxo, Rio de Janeiro.</p>
      </section>

      <section class="lineage-panel current" data-tree-section>
        <header class="lineage-header"><div><span>Família atual • após 2004</span><h3>Carlos, Francisca e Victor</h3></div><p>Carlos constituiu família com Francisca Maria Diniz. O filho do casal, Victor Cezar Diniz Lima, nasceu em 2010 e vive com os pais em Beberibe, Ceará.</p></header>
        <div class="family-core">${pairCards('carlos-andre-tavares-lima','francisca-maria-diniz','foco','current','Carlos','Família atual')}<span class="family-arrow">↓</span>${treeCard('victor-cezar-diniz-lima','current','2010')}</div>
      </section>

      <section class="lineage-panel previous" data-tree-section>
        <header class="lineage-header"><div><span>União anterior • 1995 a 2002</span><h3>Gabriel, Giulia e seus descendentes</h3></div><p>Maria Elza Silva Ferreira aparece em posição secundária, como mãe de Gabriel e Giulia. Desde 2002, os três vivem em Miguel Alves, Piauí.</p></header>
        <div class="descendant-layout">
          <div class="family-core">${pairCards('carlos-andre-tavares-lima','maria-elza-silva-ferreira','foco','previous','Carlos','Mãe de Gabriel e Giulia')}<span class="family-arrow">↓</span><div class="descendant-children">${treeCard('gabriel-ferreira-lima')}${treeCard('giulia-ferreira-lima')}</div></div>
          <div class="generation-row">
            <div class="grandchildren-group"><strong>Filhas de Gabriel</strong><div class="family-row">${treeCard('yasmim')}${treeCard('louise')}</div></div>
            <div class="grandchildren-group"><strong>Filho de Giulia</strong><div class="family-row">${treeCard('thomaz')}</div></div>
          </div>
        </div>
      </section>

      <section class="all-members-directory" data-tree-section>
        <header><div><span class="eyebrow">Lista completa</span><h3>Todos os ${people.length} familiares</h3></div><p>Esta lista evita que qualquer pessoa fique escondida pela escala da teia interativa.</p></header>
        <div class="all-members-grid">${directory}</div>
        <div class="tree-no-results">Nenhum familiar corresponde ao filtro informado.</div>
      </section>`;
  }

  function filterCompleteTree(term = '', branch = 'all') {
    const normalized = term.trim().toLocaleLowerCase('pt-BR');
    let visibleCount = 0;
    $$('.person-tree-card', $('#completeTreeContent')).forEach(card => {
      const matchesName = !normalized || card.dataset.personName.includes(normalized);
      const personBranch = card.dataset.personBranch;
      const matchesBranch = branch === 'all' || personBranch === branch || (branch === 'central' && ['central','foco'].includes(personBranch));
      const show = matchesName && matchesBranch;
      card.classList.toggle('hidden-by-filter', !show);
      if (show) visibleCount++;
    });
    $$('[data-tree-section]', $('#completeTreeContent')).forEach(section => {
      const hasVisible = !!section.querySelector('.person-tree-card:not(.hidden-by-filter)');
      section.hidden = section.classList.contains('all-members-directory') ? false : !hasVisible;
    });
    $('#completeTreeContent').classList.toggle('has-no-results', visibleCount === 0);
    return visibleCount;
  }

  function setTreeMode(mode) {
    treeMode = mode;
    const complete = $('#completeTreeView');
    const interactive = $('#interactiveTreeView');
    const completeButton = $('#showCompleteTree');
    const interactiveButton = $('#showInteractiveTree');
    const isComplete = mode === 'complete';
    complete.hidden = !isComplete;
    interactive.hidden = isComplete;
    completeButton.classList.toggle('active', isComplete);
    interactiveButton.classList.toggle('active', !isComplete);
    completeButton.setAttribute('aria-selected', String(isComplete));
    interactiveButton.setAttribute('aria-selected', String(!isComplete));
    if (!isComplete) {
      const term = $('#treeSearch').value.trim().toLocaleLowerCase('pt-BR');
      const branch = $('#branchFilter').value;
      let list = people.filter(p => (branch === 'all' || p.branch === branch || (branch === 'central' && ['central','foco'].includes(p.branch))) && (!term || p.name.toLocaleLowerCase('pt-BR').includes(term)));
      if (!list.length) list = people;
      setTimeout(() => renderFamilyNetwork(list), 80);
    }
  }

  function renderFamilyNetwork(list = people) {
    if (!window.vis?.Network) { familyFallback(list); return; }
    const data = buildFamilyData(list);
    familyNodes = new vis.DataSet(data.nodes);
    familyEdges = new vis.DataSet(data.edges);
    const container = $('#familyNetwork');
    container.hidden = false; $('#familyFallback').hidden = true;
    if (familyNetwork) familyNetwork.destroy();
    familyNetwork = new vis.Network(container, {nodes:familyNodes,edges:familyEdges}, {
      autoResize:true,
      layout:{hierarchical:{enabled:true,direction:'UD',sortMethod:'directed',levelSeparation:150,nodeSpacing:125,treeSpacing:190,blockShifting:true,edgeMinimization:true,parentCentralization:true}},
      physics:false,
      interaction:{hover:true,tooltipDelay:100,dragNodes:true,dragView:true,zoomView:true,navigationButtons:true,keyboard:true,multiselect:false},
      nodes:{chosen:true},
      edges:{chosen:true}
    });
    familyNetwork.on('click', params => { if (params.nodes.length) openProfile(params.nodes[0]); });
    familyNetwork.once('afterDrawing', () => familyNetwork.fit({ animation:{duration:700,easingFunction:'easeInOutQuad'} }));
  }

  function filterTree() {
    const term = $('#treeSearch').value.trim().toLocaleLowerCase('pt-BR');
    const branch = $('#branchFilter').value;
    const visible = filterCompleteTree(term, branch);
    if (!visible) toast('Nenhum familiar encontrado com esse filtro.');
    if (treeMode === 'interactive') {
      let list = people.filter(p => (branch === 'all' || p.branch === branch || (branch === 'central' && ['central','foco'].includes(p.branch))) && (!term || p.name.toLocaleLowerCase('pt-BR').includes(term)));
      if (term && list.length === 1) {
        const focus = list[0];
        const related = new Set([focus.id,...focus.parents,...focus.partners,...focus.children]);
        list = people.filter(p => related.has(p.id));
      }
      renderFamilyNetwork(list.length ? list : people);
    }
  }

  function initFamilyNetwork() {
    const completeCount = $('#showCompleteTree strong');
    if (completeCount) completeCount.textContent = `${people.length} familiares`;
    renderCompleteTree();
    filterCompleteTree();
    $('#showCompleteTree').addEventListener('click', () => setTreeMode('complete'));
    $('#showInteractiveTree').addEventListener('click', () => setTreeMode('interactive'));
    $('#completeTreeContent').addEventListener('click', e => {
      const card = e.target.closest('[data-open-person]');
      if (card) openProfile(card.dataset.openPerson);
    });
    $('#fitTree').addEventListener('click', () => {
      if (treeMode === 'complete') {
        $('#treeSearch').value = '';
        $('#branchFilter').value = 'all';
        filterCompleteTree();
        $('#completeTreeView').scrollIntoView({behavior:'smooth', block:'start'});
      } else {
        familyNetwork?.fit({ animation:{duration:650,easingFunction:'easeInOutQuad'} });
      }
    });
    $('#branchFilter').addEventListener('change', filterTree);
    let t;
    $('#treeSearch').addEventListener('input', () => { clearTimeout(t); t=setTimeout(filterTree,220); });
  }

  function personLink(id) {
    const p = byId[id];
    return p ? `<button class="relation-chip" type="button" data-open-person="${p.id}">${esc(p.name)}</button>` : '';
  }

  function openProfile(id) {
    const p = byId[id]; if (!p) return;
    const relationBlock = (label, ids) => ids.length ? `<div class="profile-section"><h3>${label}</h3><div class="relations">${ids.map(personLink).join('')}</div></div>` : '';
    const galleryBlock = Array.isArray(p.gallery) && p.gallery.length
      ? `<div class="profile-section"><h3>Galeria familiar</h3><div class="profile-gallery">${p.gallery.map((src,i)=>`<a href="${esc(src)}" target="_blank" rel="noopener noreferrer"><img src="${esc(src)}" loading="lazy" alt="Fotografia ${i+1} de ${esc(p.name)}"></a>`).join('')}</div></div>`
      : '';
    const socialBlock = p.facebook
      ? `<div class="profile-section"><h3>Facebook</h3><a class="btn social-facebook" href="${esc(p.facebook)}" target="_blank" rel="noopener noreferrer">Abrir publicação no Facebook ↗</a></div>`
      : '';
    const unionBlock = p.id === 'carlos-andre-tavares-lima'
      ? `<div class="profile-section family-current-block"><span class="relationship-kicker">Família atual</span><h3>Francisca Maria Diniz</h3><p>Após 2004 • vida familiar atual em Beberibe, Ceará.</p><div class="relations"><button class="relation-chip current" type="button" data-open-person="francisca-maria-diniz">Abrir perfil de Francisca</button><button class="relation-chip current" type="button" data-open-person="victor-cezar-diniz-lima">Victor Cezar Diniz Lima • 2010</button></div></div><div class="profile-section family-previous-block"><span class="relationship-kicker">União anterior • 1995 a 2002</span><button class="previous-name" type="button" data-open-person="maria-elza-silva-ferreira">Maria Elza Silva Ferreira</button><p>Mãe de Gabriel e Giulia. O nome permanece registrado em posição secundária, ligado à história dos dois filhos.</p></div>`
      : relationBlock('Uniões',p.partners);
    $('#profileContent').innerHTML = `
      <div class="profile-hero">
        <img src="${personPhoto(p)}" alt="Imagem de ${esc(p.name)}">
        <span class="profile-kicker">${p.branch === 'foco' ? 'Indivíduo foco' : 'Memorial familiar'}</span>
        <h2>${esc(p.name)}</h2>
        <p>${esc(p.summary)}</p>
      </div>
      <div class="profile-body">
        <div class="facts">
          <div class="fact"><span>Nascimento</span><strong>${esc(p.birth || 'Em pesquisa')}</strong></div>
          <div class="fact"><span>Local</span><strong>${esc(p.birthPlace || 'Em pesquisa')}</strong></div>
          <div class="fact"><span>Geração</span><strong>${esc(String(p.generation))}ª camada do mapa</strong></div>
          <div class="fact"><span>Ramo</span><strong>${esc(p.branch.replace('-', ' '))}</strong></div>
        </div>
        <div class="profile-section"><h3>História inicial</h3><p>${esc(p.bio).replace(/\n/g,'<br>')}</p></div>${p.imageNote ? `<div class="profile-section"><p><small>${esc(p.imageNote)}</small></p></div>` : ''}
        ${galleryBlock}
        ${socialBlock}
        ${relationBlock('Pais',p.parents)}
        ${unionBlock}
        ${relationBlock('Filhos',p.children)}
        <div class="profile-section"><h3>Próximos registros</h3><p>Fotografias, documentos, locais de moradia, profissão, lembranças em áudio e acontecimentos marcantes poderão ser adicionados nesta página.</p></div>
        <a class="btn primary profile-page-link" href="pessoas/${p.slug}.html">Abrir página pública individual</a>
      </div>`;
    const drawer = $('#profileDrawer');
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    history.replaceState(null,'','#pessoa='+p.slug);
  }

  function closeProfile() {
    const drawer = $('#profileDrawer');
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    if (location.hash.startsWith('#pessoa=')) history.replaceState(null,'',location.pathname+location.search);
  }

  function initProfileDrawer() {
    $('#profileDrawer').addEventListener('click', e => {
      if (e.target.closest('[data-close-profile]')) closeProfile();
      const rel = e.target.closest('[data-open-person]');
      if (rel) openProfile(rel.dataset.openPerson);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeProfile(); $('#posterModal')?.close(); } });
    const sheet = $('#profileSheet'), handle = $('#profileDragHandle');
    let startY=0, currentY=0, dragging=false;
    handle.addEventListener('pointerdown', e => { dragging=true;startY=e.clientY;currentY=startY;handle.setPointerCapture(e.pointerId);sheet.style.transition='none'; });
    handle.addEventListener('pointermove', e => { if(!dragging)return;currentY=e.clientY;const d=Math.max(0,currentY-startY);sheet.style.transform=`translateY(${d}px)`; });
    handle.addEventListener('pointerup', e => { if(!dragging)return;dragging=false;sheet.style.transition='';const d=currentY-startY;sheet.style.transform='';if(d>120) closeProfile(); });
    const hash = decodeURIComponent(location.hash || '');
    if (hash.startsWith('#pessoa=')) {
      const slug = hash.split('=')[1]; const p = people.find(x => x.slug === slug); if (p) setTimeout(()=>openProfile(p.id),300);
    }
  }

  function initTimeline() {
    const items = [
      ['c. 1850','Celina em Portugal','A raiz materna mais antiga conhecida nasce em Portugal.'],
      ['1946','Nascimento de Cezar Mario','Cezar Mario Batista de Lima nasce na zona rural de Bom Jesus, Espírito Santo, em meio às plantações de café.'],
      ['Juventude','Do campo aos estaleiros','Ainda jovem, Cezar deixa o Espírito Santo, muda-se para o Rio de Janeiro e constrói sua carreira como caldeireiro nos estaleiros fluminenses.'],
      ['1969','Mauro Cezar','Primogênito de Cezar e Edir, nasceu morto quando a família vivia na Estrada do Tinguazinho, em Austin, Nova Iguaçu.'],
      ['1970','Marcia Celina','Segunda filha de Cezar e Edir.'],
      ['1972','Adriana Cristina','Terceira filha de Cezar e Edir.'],
      ['1973','Julio Cezar','Quarto filho de Cezar e Edir. Aos cinco meses, adoeceu com meningite e faleceu após cerca de seis meses de internação hospitalar.'],
      ['1975','Nascimento de Carlos em Austin','Quinto filho de Cezar e Edir. Carlos nasce em casa, na Estrada do Tinguazinho, em Austin, Nova Iguaçu. Sua avó Sebastiana realizou o parto antes da chegada da parteira.'],
      ['1976','Rogerio Tavares','Sexto filho de Cezar e Edir.'],
      ['1978','Mudança de Cezar para São Paulo','Cezar muda-se com os filhos para a capital paulista, continua trabalhando como caldeireiro no ABC Paulista e posteriormente constitui família com Joana Xavier de Lima.'],
      ['Após os 40','Serralheria artística e COESME','Cezar passa a atuar como serralheiro artístico, monta sua oficina na Rua da Mooca e torna-se proprietário da COESME — Cobertura e Estruturas Metálicas.'],
      ['1978','Cezar e Joana em São Paulo','Segundo a memória familiar, após a separação de Edir, Cezar casou-se com Joana Xavier de Lima e passou a viver em São Paulo com os filhos. Edir permaneceu em Belford Roxo, Rio de Janeiro.'],
      ['1990','Nascimento de Jéssica','Jéssica Lindsey Xavier de Lima nasce em 6 de julho, no bairro da Mooca, em São Paulo, filha de Cezar e Joana.'],
      ['1995–2002','União anterior','Carlos e Maria Elza viveram juntos em Itapevi, São Paulo. Dessa união nasceram Gabriel e Giulia.'],
      ['2000','Nascimento de Gabriel','Gabriel nasce em 18 de novembro, no bairro da Mooca, em São Paulo.'],
      ['2002','Nascimento de Giulia','Giulia nasce em 25 de setembro, em Itapevi, São Paulo.'],
      ['2002','Mudança para o Piauí','Maria Elza, Gabriel e Giulia passam a viver em Miguel Alves, Piauí.'],
      ['Após 2004','Família atual','Carlos e Francisca Maria Diniz constituem família.'],
      ['2010','AVC de Cezar Mario','Cezar sofre um acidente vascular cerebral e permanece acamado durante aproximadamente cinco anos.'],
      ['2010','Victor Cezar Diniz Lima','Victor nasce em 25 de setembro, no bairro da Mooca, em São Paulo, filho de Carlos e Francisca.'],
      ['2015','Falecimento de Cezar Mario','Cezar Mario Batista de Lima falece, deixando uma história de trabalho, fé e muitas saudades.'],
      ['2021–2025','Nova geração','Chegam Yasmim, Thomaz e Louise, ampliando a continuidade familiar.'],
      ['Atualidade','Dois núcleos familiares','Maria Elza, Gabriel e Giulia vivem em Miguel Alves; Carlos, Francisca e Victor vivem em Beberibe, Ceará.']
    ];
    $('#timelineList').innerHTML = items.map(([time,title,text]) => `<article class="timeline-item"><time>${time}</time><h3>${title}</h3><p>${text}</p></article>`).join('');
  }

  function initSearch() {
    const input = $('#globalSearch');
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const term = input.value.trim().toLocaleLowerCase('pt-BR'); if (!term) return;
      const found = people.find(p => p.name.toLocaleLowerCase('pt-BR').includes(term));
      if (found) openProfile(found.id); else toast('Nome não encontrado no memorial.');
    });
  }

  function loadMemories() {
    try { return JSON.parse(localStorage.getItem('legado-memories') || '[]'); } catch { return []; }
  }
  function saveMemories(data) { localStorage.setItem('legado-memories', JSON.stringify(data)); }
  function renderMemories() {
    const list = loadMemories();
    $('#memoryList').innerHTML = list.map(item => `<article class="saved-memory"><span>${esc(item.personName)} • ${esc(item.date)}</span><h4>${esc(item.title)}</h4><p>${esc(item.text)}</p></article>`).join('');
  }
  function initMemories() {
    $('#memoryPerson').innerHTML = '<option value="">Selecione</option>'+people.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    $('#memoryForm').addEventListener('submit', e => {
      e.preventDefault(); const id=$('#memoryPerson').value; const p=byId[id];
      if(!p)return;
      const list=loadMemories(); list.unshift({id:Date.now(),person:id,personName:p.name,title:$('#memoryTitle').value.trim(),text:$('#memoryText').value.trim(),date:new Date().toLocaleDateString('pt-BR')});
      saveMemories(list); e.target.reset(); renderMemories(); toast('Memória guardada neste dispositivo.');
    });
    $('#exportMemories').addEventListener('click', () => {
      const list=loadMemories(); if(!list.length){toast('Ainda não há contribuições para exportar.');return;}
      const blob=new Blob([JSON.stringify({exportadoEm:new Date().toISOString(),memorias:list},null,2)],{type:'application/json'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='memorias-legado-tavares-e-lima.json';a.click();URL.revokeObjectURL(a.href);
    });
    renderMemories();
  }

  const quizItems = [
    {id:'q1',name:'Celina',generation:'ancestral'},
    {id:'q2',name:'Cezar Mario Batista de Lima',generation:'central'},
    {id:'q3',name:'Edir Tavares Cabral',generation:'central'},
    {id:'q4',name:'Gabriel Ferreira Lima',generation:'filhos'},
    {id:'q5',name:'Giulia Ferreira Lima',generation:'filhos'},
    {id:'q6',name:'Thomaz',generation:'netos'}
  ];
  let selectedQuiz = null;
  function quizCard(item){return `<button class="drag-card" id="${item.id}" draggable="true" data-generation="${item.generation}" type="button">${esc(item.name)}</button>`;}
  function updateScore(){const score=$$('.drag-card.correct').length;$('#quizScore').textContent=`${score} / ${quizItems.length}`;if(score===quizItems.length){$('#quizFeedback').textContent='Mapa concluído. Você reconstruiu corretamente a continuidade familiar.';toast('Desafio concluído!');}}
  function placeQuiz(card, zone){
    if(!card||card.classList.contains('correct'))return;
    if(card.dataset.generation===zone.dataset.generation){zone.querySelector('.drop-content').appendChild(card);card.classList.add('correct');card.classList.remove('selected');card.draggable=false;selectedQuiz=null;$('#quizFeedback').textContent='Posição correta. Continue.';updateScore();}
    else{card.classList.add('wrong');setTimeout(()=>card.classList.remove('wrong'),400);$('#quizFeedback').textContent='Esse nome pertence a outra camada da árvore.';}
  }
  function resetQuiz(){selectedQuiz=null;$('#dragBank').innerHTML=quizItems.sort(()=>Math.random()-.5).map(quizCard).join('');$$('.drop-content').forEach(x=>x.innerHTML='');$('#quizScore').textContent=`0 / ${quizItems.length}`;$('#quizFeedback').textContent='Selecione ou arraste o primeiro nome.';bindQuizCards();}
  function bindQuizCards(){
    $$('.drag-card').forEach(card=>{
      card.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',card.id);selectedQuiz=card;});
      card.addEventListener('click',()=>{if(card.classList.contains('correct'))return;$$('.drag-card').forEach(x=>x.classList.remove('selected'));selectedQuiz=card;card.classList.add('selected');$('#quizFeedback').textContent='Agora toque na camada de destino.';});
    });
  }
  function initQuiz(){
    resetQuiz();
    $$('.drop-zone').forEach(zone=>{
      zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover');});
      zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
      zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragover');placeQuiz(document.getElementById(e.dataTransfer.getData('text/plain')),zone);});
      zone.addEventListener('click',()=>{if(selectedQuiz)placeQuiz(selectedQuiz,zone);});
    });
    $('#resetQuiz').addEventListener('click',resetQuiz);
  }

  let breakSeconds = 20*60, breakTimer = null, restTimer = null, restSeconds = 60;
  function updateBreakLabel(){const m=Math.floor(breakSeconds/60),s=breakSeconds%60;$('#nextBreak').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
  function resetBreak(minutes){breakSeconds=minutes*60;updateBreakLabel();localStorage.setItem('legado-break',String(minutes));}
  function showRest(){
    clearInterval(restTimer);restSeconds=60;$('#restCountdown').textContent=restSeconds;$('#restOverlay').classList.add('active');$('#restOverlay').setAttribute('aria-hidden','false');document.body.classList.add('rest-mode');
    restTimer=setInterval(()=>{restSeconds--;$('#restCountdown').textContent=restSeconds;const phase=restSeconds%8;$('#breathText').textContent=phase>=4?'Expire':'Inspire';if(restSeconds<=0)endRest();},1000);
  }
  function endRest(extra=0){clearInterval(restTimer);$('#restOverlay').classList.remove('active');$('#restOverlay').setAttribute('aria-hidden','true');document.body.classList.remove('rest-mode');resetBreak(extra||Number($('#breakInterval').value));}
  function initBioClock(){
    const saved=Number(localStorage.getItem('legado-break')||20);$('#breakInterval').value=String(saved);resetBreak(saved);
    breakTimer=setInterval(()=>{if(!$('#restOverlay').classList.contains('active')){breakSeconds--;updateBreakLabel();if(breakSeconds<=0)showRest();}},1000);
    $('#breakInterval').addEventListener('change',e=>resetBreak(Number(e.target.value)));
    $('#startBreakNow').addEventListener('click',showRest);$('#openClock').addEventListener('click',()=>document.getElementById('relogio-biologico').scrollIntoView({behavior:'smooth'}));
    $('#endRest').addEventListener('click',()=>endRest());$('#snoozeRest').addEventListener('click',()=>endRest(5));
    const tick=()=>{const d=new Date();$('#liveClock').textContent=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});const h=d.getHours();document.body.dataset.dayphase=h<6?'night':h<12?'morning':h<18?'day':'evening';};tick();setInterval(tick,1000);
  }


  function albumEntryDescription(person, src, index) {
    const file = src.split('/').pop().toLocaleLowerCase('pt-BR');
    if (/representação artística/i.test(person.imageNote || '')) return index === 0 ? `Representação artística de ${person.name}.` : `Variação artística do acervo de ${person.name}.`;
    if (person.id === 'celina') return index === 0 ? 'Representação artística de Celina em retrato.' : 'Representação artística da jornada de Celina entre Portugal e o Brasil.';
    if (file.includes('cezar-mario-com-primo')) return 'Cezar Mario em pé ao lado de um primo, em registro familiar.';
    if (file.includes('familia')) return `Registro familiar relacionado a ${person.name}.`;
    if (file.includes('original')) return `Arquivo original preservado de ${person.name}.`;
    if (index === 0) return `Retrato principal de ${person.name}.`;
    return `Fotografia do acervo familiar de ${person.name}.`;
  }

  function canonicalAlbumKey(src) {
    const file = String(src || '').split('/').pop().toLocaleLowerCase('pt-BR');
    return file
      .replace(/\.(webp|png|jpe?g|gif|avif)$/i, '')
      .replace(/-original$/i, '')
      .replace(/-copia$/i, '')
      .replace(/-copy$/i, '');
  }

  function uniqueAlbumSources(person) {
    const raw = [person.photo, ...(Array.isArray(person.gallery) ? person.gallery : [])].filter(Boolean);
    const exact = [...new Set(raw)];
    const ordered = exact.sort((a, b) => Number(/-original\./i.test(a)) - Number(/-original\./i.test(b)));
    const seen = new Set();
    return ordered.filter(src => {
      const key = canonicalAlbumKey(src);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function buildAlbumEntries() {
    const entries = [];
    people.forEach(person => {
      const sources = uniqueAlbumSources(person);
      if (!sources.length) {
        entries.push({person, kind:'pending', src:personPhoto(person), description:'Espaço reservado para uma fotografia real deste familiar.', uploadedBy:'Aguardando contribuição', date:'—'});
        return;
      }
      sources.forEach((src, index) => entries.push({
        person,
        kind: ((person.id === 'celina') || /representação artística/i.test(person.imageNote || '')) ? 'artistic' : 'real',
        src,
        description: albumEntryDescription(person, src, index),
        uploadedBy: 'Carlos André Tavares de Lima',
        date: 'Julho de 2026'
      }));
    });
    return entries;
  }

  let albumEntries = [];
  function renderAlbum() {
    const grid = $('#familyAlbumGrid'); if (!grid) return;
    const term = ($('#albumSearch')?.value || '').trim().toLocaleLowerCase('pt-BR');
    const filter = $('#albumFilter')?.value || 'all';
    const visible = albumEntries.filter(item => {
      const nameMatch = item.person.name.toLocaleLowerCase('pt-BR').includes(term);
      const typeMatch = filter === 'all' || item.kind === filter;
      return nameMatch && typeMatch;
    });
    grid.innerHTML = visible.map((item, index) => {
      const isPending = item.kind === 'pending';
      const badge = item.kind === 'artistic' ? 'Representação artística' : isPending ? 'Foto pendente' : 'Fotografia do acervo';
      return `<article class="album-card glass ${item.kind}" data-album-person="${esc(item.person.id)}">
        <button class="album-photo-button" type="button" ${isPending ? 'data-goto-contribution' : `data-photo-src="${esc(item.src)}" data-photo-title="${esc(item.person.name)}" data-photo-text="${esc(item.description)}"`}>
          <img src="${esc(item.src)}" alt="${isPending ? 'Espaço reservado para foto de ' : 'Fotografia de '}${esc(item.person.name)}" loading="lazy">
          <span class="album-badge">${badge}</span>${isPending ? '<span class="album-add">＋ Enviar fotografia</span>' : '<span class="album-expand">Ampliar ↗</span>'}
        </button>
        <div class="album-card-copy"><h3>${esc(item.person.name)}</h3><p>${esc(item.description)}</p><dl><div><dt>Enviado por</dt><dd>${esc(item.uploadedBy)}</dd></div><div><dt>Inclusão</dt><dd>${esc(item.date)}</dd></div></dl><button class="text-btn album-profile-link" type="button" data-person="${esc(item.person.id)}">Abrir perfil individual →</button></div>
      </article>`;
    }).join('') || '<div class="album-empty glass">Nenhuma imagem corresponde aos filtros escolhidos.</div>';
  }

  function initPhotoAlbum() {
    albumEntries = buildAlbumEntries();
    const realCount = albumEntries.filter(x => x.kind !== 'pending').length;
    const pendingCount = albumEntries.filter(x => x.kind === 'pending').length;
    if ($('#albumPhotoCount')) $('#albumPhotoCount').textContent = realCount;
    if ($('#albumPendingCount')) $('#albumPendingCount').textContent = `${pendingCount} espaços aguardando foto`;
    renderAlbum();
    $('#albumSearch')?.addEventListener('input', renderAlbum);
    $('#albumFilter')?.addEventListener('change', renderAlbum);
    $('#clearAlbumFilter')?.addEventListener('click', () => { $('#albumSearch').value=''; $('#albumFilter').value='all'; renderAlbum(); });
    $('#familyAlbumGrid')?.addEventListener('click', e => {
      const profile = e.target.closest('[data-person]');
      if (profile) { openProfile(profile.dataset.person); return; }
      const add = e.target.closest('[data-goto-contribution]');
      if (add) { document.getElementById('contribuir')?.scrollIntoView({behavior:'smooth'}); return; }
      const photo = e.target.closest('[data-photo-src]');
      if (!photo) return;
      $('#photoModalImage').src = photo.dataset.photoSrc;
      $('#photoModalImage').alt = photo.dataset.photoTitle;
      $('#photoModalTitle').textContent = photo.dataset.photoTitle;
      $('#photoModalText').textContent = photo.dataset.photoText;
      $('#photoModal').showModal();
    });
    $('#closePhotoModal')?.addEventListener('click', () => $('#photoModal').close());
    $('#photoModal')?.addEventListener('click', e => { if (e.target === $('#photoModal')) $('#photoModal').close(); });
  }

  function renderSurnames(filter='all') {
    const grid = $('#surnameGrid'); if (!grid) return;
    const visible = surnames.filter(s => {
      if (filter === 'all') return true;
      if (filter === 'current') return !['Raízes maternas','Raízes paternas','Ramo de Sebastiana'].includes(s.branch);
      return s.branch === filter || (filter === 'Raízes paternas' && s.branch === 'Ramo de Sebastiana');
    });
    grid.innerHTML = visible.map((s, i) => `<article class="surname-card glass reveal visible">
      <div class="surname-card-top">${s.crest ? `<button class="surname-crest-button" data-crest-src="${esc(s.crest)}" data-crest-title="Brasão ${esc(s.name)}" type="button"><img alt="Brasão ilustrativo ${esc(s.name)}" class="surname-crest-image" loading="lazy" src="${esc(s.crest)}"/></button>` : `<div class="surname-shield tone-${(i%6)+1}" aria-hidden="true"><span>${esc(s.initials)}</span></div>`}<div><span class="surname-status">${esc(s.status)}</span><h3>${esc(s.name)}</h3><small>${esc(s.kind)}</small></div></div>
      <p class="surname-meaning">${esc(s.meaning)}</p>
      <div class="surname-family"><strong>Na árvore familiar</strong><p>${esc(s.family)}</p></div>
      <details><summary>Brasão e situação da pesquisa</summary><p>${esc(s.heraldry)}</p></details>
      <a class="surname-source" href="${esc(s.source)}" target="_blank" rel="noopener">Consultar fonte da origem ↗</a>
    </article>`).join('');
  }

  function renderCrests() {
    const grid = $('#crestGrid'); if (!grid) return;
    grid.innerHTML = coats.map(c => `<article class="crest-card glass reveal visible">
      <button class="crest-card-button" data-crest-src="${esc(c.image)}" data-crest-title="${esc(c.name)}" type="button">
        <img alt="Brasão ${esc(c.name)}" loading="lazy" src="${esc(c.image)}"/>
      </button>
      <div><h4>${esc(c.name)}</h4><p>${esc(c.note)}</p></div>
    </article>`).join('');
  }

  function openCrest(src, title) {
    $('#photoModalImage').src = src;
    $('#photoModalImage').alt = title;
    $('#photoModalTitle').textContent = title;
    $('#photoModalText').textContent = 'Representação heráldica ou artística utilizada no memorial. A presença do sobrenome não comprova automaticamente vínculo com uma linhagem armigerada.';
    $('#photoModal').showModal();
  }

  function initSurnames() {
    renderCrests();
    renderSurnames();
    $$('.surname-filter').forEach(btn => btn.addEventListener('click', () => {
      $$('.surname-filter').forEach(x => x.classList.toggle('active', x === btn));
      renderSurnames(btn.dataset.surnameFilter);
    }));
    $('#sobrenomes')?.addEventListener('click', e => {
      const button = e.target.closest('[data-crest-src]');
      if (button) openCrest(button.dataset.crestSrc, button.dataset.crestTitle);
    });
    $('#openCrestPanel')?.addEventListener('click', () => openCrest('assets/brasoes/galeria-completa.webp', 'Painel completo de brasões'));
  }

  function mailto(subject, body) {
    location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function setHistoryCardDetails(button, open) {
    if (!button) return;
    const targetId = button.getAttribute('aria-controls');
    const details = targetId ? document.getElementById(targetId) : null;
    if (!details) return;
    details.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    const label = button.querySelector('span');
    if (label) label.textContent = open ? 'Esconder detalhes' : 'Ler detalhes';
    const icon = button.querySelector('i');
    if (icon) icon.textContent = open ? '⌃' : '⌄';
    button.closest('.world-history-card')?.classList.toggle('details-open', open);
  }

  function setFeatureSection(button, open) {
    if (!button) return;
    const targetId = button.dataset.sectionToggle;
    const body = targetId ? document.getElementById(targetId) : null;
    if (!body) return;
    body.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    const label = button.querySelector('span');
    if (label) label.textContent = open ? 'Esconder seção' : 'Expandir seção';
    const icon = button.querySelector('i');
    if (icon) icon.textContent = open ? '⌃' : '⌄';
    button.closest('.collapsible-feature-section')?.classList.toggle('section-open', open);
  }

  function initHistoryDisclosure() {
    $$('[data-section-toggle]').forEach(button => {
      setFeatureSection(button, false);
      button.addEventListener('click', () => {
        const open = button.getAttribute('aria-expanded') !== 'true';
        setFeatureSection(button, open);
      });
    });

    [$('#worldHistoryGrid'), $('#humanDiscoveriesGrid')].forEach(grid => {
      grid?.addEventListener('click', event => {
        const button = event.target.closest('[data-card-details-toggle]');
        if (!button) return;
        setHistoryCardDetails(button, button.getAttribute('aria-expanded') !== 'true');
      });
    });

    $$('[data-detail-action]').forEach(button => button.addEventListener('click', () => {
      const grid = document.getElementById(button.dataset.detailGrid || '');
      const open = button.dataset.detailAction === 'open';
      grid?.querySelectorAll('[data-card-details-toggle]').forEach(toggle => setHistoryCardDetails(toggle, open));
    }));
  }

  function renderWorldHistory(filter='all') {
    const grid = $('#worldHistoryGrid');
    if (!grid) return;
    const events = Array.isArray(window.HISTORIA_MUNDIAL) ? window.HISTORIA_MUNDIAL : [];
    const visible = events.filter(event => filter === 'all' || event.century === filter).sort((a,b) => Number(a.year) - Number(b.year));
    const list = (items, type, title) => {
      if (!Array.isArray(items) || !items.length) return '';
      return `<div class="history-family-group ${type}"><strong>${title}</strong><ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`;
    };
    grid.innerHTML = visible.map(event => {
      const detailsId = `history-details-${event.id}`;
      return `<article class="world-history-card glass reveal visible" data-century="${esc(event.century)}">
        <header class="world-history-head">
          <div class="history-icon" aria-hidden="true">${esc(event.icon)}</div>
          <div><span class="history-date">${esc(event.date)}</span><h3>${esc(event.title)}</h3><p>${esc(event.subtitle)}</p></div>
          <strong class="history-year">${esc(event.year)}</strong>
        </header>
        <div class="history-card-preview">
          <span>Consulte o acontecimento, os ancestrais da época e os possíveis impactos.</span>
          <button class="history-card-toggle" type="button" data-card-details-toggle aria-controls="${esc(detailsId)}" aria-expanded="false"><span>Ler detalhes</span><i aria-hidden="true">⌄</i></button>
        </div>
        <div class="history-card-details" id="${esc(detailsId)}" hidden>
          <div class="history-fact-copy">${event.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</div>
          <div class="history-family-panel">
            <span class="eyebrow">Quem da família vivia nessa época?</span>
            ${list(event.confirmed,'confirmed','Presença confirmada')}
            ${list(event.probable,'probable','Presença provável')}
            ${list(event.possible,'possible','Presença possível')}
          </div>
          <div class="history-reaction">
            <strong>Como podem ter reagido ou sido afetados?</strong>
            <p>${esc(event.familyReaction)}</p>
          </div>
          <div class="history-confidence"><strong>Grau de certeza:</strong> ${esc(event.confidence)}</div>
          <a class="history-source" href="${esc(event.sourceUrl)}" target="_blank" rel="noopener">${esc(event.sourceLabel)} ↗</a>
        </div>
      </article>`;
    }).join('') || '<div class="album-empty glass">Nenhum acontecimento encontrado neste período.</div>';
  }

  function initWorldHistory() {
    if (!$('#worldHistoryGrid')) return;
    const events = Array.isArray(window.HISTORIA_MUNDIAL) ? window.HISTORIA_MUNDIAL : [];
    if ($('#historyEventCount')) $('#historyEventCount').textContent = `${events.length} acontecimentos • 1850–2026`;
    renderWorldHistory();
    $$('.history-filter').forEach(btn => btn.addEventListener('click', () => {
      $$('.history-filter').forEach(item => item.classList.toggle('active', item === btn));
      renderWorldHistory(btn.dataset.historyFilter || 'all');
    }));
  }

  function renderHumanDiscoveries(filter='all') {
    const grid = $('#humanDiscoveriesGrid');
    if (!grid) return;
    const items = Array.isArray(window.DESCOBERTAS_HUMANAS) ? window.DESCOBERTAS_HUMANAS : [];
    const visible = items.filter(item => filter === 'all' || item.category === filter).sort((a,b) => Number(a.year) - Number(b.year));
    const list = (entries, type, title) => {
      if (!Array.isArray(entries) || !entries.length) return '';
      return `<div class="history-family-group ${type}"><strong>${title}</strong><ul>${entries.map(entry => `<li>${esc(entry)}</li>`).join('')}</ul></div>`;
    };
    grid.innerHTML = visible.map(item => {
      const detailsId = `discovery-details-${item.id}`;
      return `<article class="world-history-card discovery-card glass reveal visible" data-category="${esc(item.category)}">
        <header class="world-history-head discovery-head">
          <div class="history-icon" aria-hidden="true">${esc(item.icon)}</div>
          <div><span class="history-date">${esc(item.date)}</span><h3>${esc(item.title)}</h3><p>${esc(item.subtitle)}</p><span class="discovery-category">${esc(item.categoryLabel)}</span></div>
          <strong class="history-year">${esc(item.year)}</strong>
        </header>
        <div class="history-card-preview">
          <span>Veja como era antes, o benefício alcançado e quais gerações viviam na época.</span>
          <button class="history-card-toggle" type="button" data-card-details-toggle aria-controls="${esc(detailsId)}" aria-expanded="false"><span>Ler detalhes</span><i aria-hidden="true">⌄</i></button>
        </div>
        <div class="history-card-details" id="${esc(detailsId)}" hidden>
          <div class="history-fact-copy">${item.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</div>
          <div class="discovery-comparison">
            <div class="discovery-before"><span>Antes</span><p>${esc(item.before)}</p></div>
            <div class="discovery-benefit"><span>Benefício</span><p>${esc(item.benefit)}</p></div>
          </div>
          <div class="history-family-panel">
            <span class="eyebrow">Quem da família vivia nessa época?</span>
            ${list(item.confirmed,'confirmed','Presença confirmada')}
            ${list(item.probable,'probable','Presença provável')}
            ${list(item.possible,'possible','Presença possível')}
          </div>
          <div class="history-reaction discovery-impact">
            <strong>Como esse avanço pode ter alcançado a família?</strong>
            <p>${esc(item.familyImpact)}</p>
          </div>
          <div class="history-confidence"><strong>Grau de certeza:</strong> ${esc(item.confidence)}</div>
          <a class="history-source" href="${esc(item.sourceUrl)}" target="_blank" rel="noopener">${esc(item.sourceLabel)} ↗</a>
        </div>
      </article>`;
    }).join('') || '<div class="album-empty glass">Nenhuma descoberta encontrada nesta categoria.</div>';
  }

  function initHumanDiscoveries() {
    if (!$('#humanDiscoveriesGrid')) return;
    const items = Array.isArray(window.DESCOBERTAS_HUMANAS) ? window.DESCOBERTAS_HUMANAS : [];
    if ($('#discoveryCount')) $('#discoveryCount').textContent = `${items.length} descobertas • 1850–1989`;
    renderHumanDiscoveries();
    $$('.discovery-filter').forEach(btn => btn.addEventListener('click', () => {
      $$('.discovery-filter').forEach(item => item.classList.toggle('active', item === btn));
      renderHumanDiscoveries(btn.dataset.discoveryFilter || 'all');
    }));
  }

  function initContribution() {
    if (!$('#contributionForm')) return;
    $('#contribPerson').innerHTML += people.map(p => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');
    $('#contributionForm').addEventListener('submit', e => {
      e.preventDefault();
      const name=$('#contribName').value.trim(), email=$('#contribEmail').value.trim(), relation=$('#contribRelation').value.trim(), person=$('#contribPerson').value || 'Informação geral', type=$('#contribType').value, text=$('#contribText').value.trim(), source=$('#contribSource').value.trim() || 'Não informada';
      const body=`Olá, Carlos.\n\nGostaria de enviar uma contribuição para análise no memorial Legado Tavares e Lima.\n\nNome: ${name}\nE-mail para retorno: ${email}\nRelação com a família: ${relation || 'Não informada'}\nPessoa relacionada: ${person}\nTipo: ${type}\n\nInformação:\n${text}\n\nFonte ou comprovação:\n${source}\n\nCaso existam fotos ou documentos, eles serão anexados a este e-mail.\n\nAutorizo que o material seja analisado e, se aprovado, publicado no memorial com os cuidados de privacidade necessários.`;
      mailto(`Contribuição para o Legado Tavares e Lima — ${person}`, body);
      toast('O programa de e-mail foi aberto. Anexe os arquivos antes de enviar.');
    });
  }

  function initModelOrder() {
    if (!$('#modelOrderForm')) return;
    $('#modelOrderForm').addEventListener('submit', e => {
      e.preventDefault();
      const name=$('#modelBuyerName').value.trim(), email=$('#modelBuyerEmail').value.trim(), size=$('#modelFamilySize').value, notes=$('#modelBuyerNotes').value.trim() || 'Ainda vou organizar as informações.';
      const body=`Olá, Carlos.\n\nTenho interesse em comprar um modelo de memorial genealógico semelhante ao Legado Tavares e Lima.\n\nNome: ${name}\nE-mail: ${email}\nTamanho aproximado da família: ${size}\n\nO que desejo incluir:\n${notes}\n\nGostaria de receber orientação, prazo e orçamento.`;
      mailto('Solicitação de modelo de memorial genealógico', body);
      toast('Solicitação preparada no seu programa de e-mail.');
    });
  }

  function initArchive() {
    $$('.archive-card').forEach(card => card.addEventListener('click', () => {
      if (card.dataset.archive === 'fotos') { document.getElementById('album-familia')?.scrollIntoView({behavior:'smooth'}); return; }
      const map={certidoes:['Certidões e registros','A área aceita documentos digitalizados, mantendo dados sensíveis fora da versão pública. Envie uma contribuição para análise antes da publicação.'],cartas:['Cartas e relatos','Espaço destinado a textos, gravações de voz, entrevistas e transcrições.'],objetos:['Objetos de memória','Cada objeto poderá ter fotografia, data aproximada, proprietário e história associada.']};
      const [title,text]=map[card.dataset.archive];$('#noticeTitle').textContent=title;$('#noticeText').textContent=text;$('#noticeModal').showModal();
    }));
    $('[data-close-notice]').addEventListener('click',()=>$('#noticeModal').close());
  }

  function initServiceWorker(){if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('service-worker.js').catch(()=>{});}

  function boot(){
    $('#peopleCount').textContent=people.length;
    initReveal();initButtons();initPoster();initNeuralNetwork();initFamilyNetwork();initProfileDrawer();initTimeline();initWorldHistory();initHumanDiscoveries();initHistoryDisclosure();initSearch();initMemories();initPhotoAlbum();initSurnames();initContribution();initModelOrder();initQuiz();initBioClock();initArchive();initServiceWorker();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
