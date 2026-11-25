// HILL AND STILL — các nhánh gợi ý A/B/C cho bản trình diễn nghiên cứu.
// A: bộ âm thanh cố định; B: chỉ theo thể loại yêu thích; C: trạng thái + mục tiêu + sở thích.
// D được xử lý ở giao diện: nghỉ yên tĩnh, không tạo danh sách âm thanh.
window.HSRecommender = (() => {
  const KEY = "hs_mvp01_profile";
  const defaults = {genreBoost:{}, energyBias:0, vocalBoost:{}, trackBoost:{}, feedbackCount:0};
  const load = () => { try { return {...defaults,...JSON.parse(localStorage.getItem(KEY)||"{}")} } catch { return {...defaults} } };
  const save = p => localStorage.setItem(KEY, JSON.stringify(p));
  function score(sound, user, profile) {
    const energy = sound.energy == null ? 3 : Number(sound.energy);
    let preference = 50, stateFit = 50, goalFit = 50;
    if(user.genre !== "any") preference += sound.genre === user.genre ? 35 : -12;
    preference += profile.genreBoost[sound.genre] || 0;
    preference += profile.favoriteGenreBoost?.[sound.genre] || 0;
    if(user.goal === "calm") goalFit += (3 - energy) * 12;
    if(user.goal === "focus") goalFit += (3 - Math.abs(energy-3)) * 10;
    if(user.goal === "energize") goalFit += (energy-3) * 13;
    if(user.goal === "uplift") goalFit += (energy-2) * 8;
    if(user.goal === "maintain") goalFit += 8 - Math.abs(energy-user.energy)*8;
    if(user.stress >= 7 && energy >= 5) stateFit -= 12;
    if(user.energy <= 2 && user.goal === "energize" && energy >= 4) stateFit += 8;
    if(user.mood === "restless" && energy >= 5 && user.goal === "calm") stateFit -= 18;
    stateFit += (profile.energyBias || 0) * (energy-3);
    const personalTrack = (profile.trackBoost[sound.id] || 0) + (profile.favoriteTrackBoost?.[sound.id] || 0);
    const ruleScore = .35*preference + .30*stateFit + .35*goalFit;
    return {score:Math.max(0,Math.min(100,ruleScore + personalTrack)), preference, stateFit, goalFit};
  }
  const stableSort = sounds => [...sounds].sort((a,b)=>String(a.id||a.title||'').localeCompare(String(b.id||b.title||'')));
  function recommendAll(sounds,user) {
    const p=load();
    return sounds.map(s=>({sound:s,...score(s,user,p)})).sort((a,b)=>b.score-a.score);
  }
  function recommendByCondition(sounds,user,condition) {
    if(condition==='A') return stableSort(sounds).map((sound,index)=>({sound,score:100-index,method:'standard'}));
    if(condition==='B') {
      return stableSort(sounds).map(sound=>({sound,score:user.genre==='any'?50:(sound.genre===user.genre?100:0),method:'preference'})).sort((a,b)=>b.score-a.score);
    }
    if(condition==='C') {
      // Dùng hồ sơ trung tính cho mỗi lượt nghiên cứu, tránh phản hồi của người trước ảnh hưởng người sau.
      const researchProfile={...defaults};
      return sounds.map(sound=>({sound,...score(sound,user,researchProfile),method:'mood_matching_shifting'})).sort((a,b)=>b.score-a.score);
    }
    return [];
  }
  function recommend(sounds,user) { return recommendAll(sounds,user).slice(0,5); }
  function favorite(sound) {
    const p=load(); p.favoriteGenreBoost=p.favoriteGenreBoost||{}; p.favoriteTrackBoost=p.favoriteTrackBoost||{};
    if(sound.genre) p.favoriteGenreBoost[sound.genre]=Math.min(10,(p.favoriteGenreBoost[sound.genre]||0)+1.5);
    if(sound.id) p.favoriteTrackBoost[sound.id]=Math.min(12,(p.favoriteTrackBoost[sound.id]||0)+3);
    save(p); return p;
  }
  function learn(sound,user,fit,comfort) {
    const p=load(), delta=((fit-3)*1.8)+((comfort-3)*1.0);
    p.trackBoost[sound.id]=Math.max(-15,Math.min(15,(p.trackBoost[sound.id]||0)+delta));
    if(user.genre!=="any") p.genreBoost[user.genre]=Math.max(-12,Math.min(12,(p.genreBoost[user.genre]||0)+(fit-3)*.7));
    p.energyBias=Math.max(-1.5,Math.min(1.5,(p.energyBias||0)+(fit-3)*.04));
    p.feedbackCount=(p.feedbackCount||0)+1; save(p); return p;
  }
  return {recommend,recommendAll,recommendByCondition,learn,favorite,load};
})();
