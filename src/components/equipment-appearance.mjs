// Each mesh owns its material copy; preserve the source appearance for recovery.
export function rememberAppearance(m) {
  m.userData.inspectionBase = {
    opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite,
    color: m.color?.clone(), emissive: m.emissive?.clone(),
    emissiveIntensity: m.emissiveIntensity,
  };
}
export function applyAppearance(m, mode, selected, active, faulty) {
  const base = m.userData.inspectionBase;
  m.opacity = faulty ? 1 : selected ? (active ? 1 : .14) : mode === '半透明' ? .28 : base.opacity;
  m.transparent = m.opacity < 1 || (!faulty && base.transparent);
  m.depthWrite = faulty ? true : mode === '实体' && !selected ? base.depthWrite : m.opacity === 1;
  m.wireframe = mode === '线框';
  if (base.color) m.color.copy(base.color);
  if (base.emissive) m.emissive.copy(base.emissive);
  m.emissiveIntensity = base.emissiveIntensity;
  if (faulty) {
    m.color?.set('#ee343e');
    m.emissive?.set('#ee1828');
    m.emissiveIntensity = .65;
  } else if (active) {
    m.emissive?.set('#3976a1');
    m.emissiveIntensity = .45;
  }
  m.needsUpdate = true;
}
