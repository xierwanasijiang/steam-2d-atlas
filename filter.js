(function(root){
  function selectGames(games,state={},favorites=new Set()) {
    const q=(state.q||'').trim().toLocaleLowerCase();
    const unique=[...new Map(games.map(g=>[g.id,g])).values()];
    return unique.filter(g=>
      (!q||[g.name,g.zh,...g.categories,...(g.subgenres||[]),g.structure||''].join(' ').toLocaleLowerCase().includes(q)) &&
      (!state.category||g.categories.includes(state.category)) &&
      (!state.subgenre||(g.subgenres||[]).includes(state.subgenre)) &&
      (!state.structure||g.structure===state.structure) &&
      (!state.style||g.style===state.style) &&
      (state.tier==='all'||g.tier===(state.tier||'main')) &&
      (!state.minRate||g.rate>=Number(state.minRate)) &&
      (!state.favoritesOnly||favorites.has(g.id))
    ).sort((a,b)=>state.sort==='name'?a.name.localeCompare(b.name):state.sort==='reviews'?b.total-a.total:state.sort==='rating'?b.rate-a.rate||b.total-a.total:(b.featured||0)-(a.featured||0)||b.total-a.total);
  }
  if(typeof module!=='undefined') module.exports={selectGames};
  root.selectGames=selectGames;
})(typeof window!=='undefined'?window:globalThis);
