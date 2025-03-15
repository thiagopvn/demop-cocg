import './ButtonMenu.css';
export default function ButtonMenu({ Icon, label, onClick, active  }) {
  return (
    <div onClick={onClick}>
      <div className={`menu-button ${active ? 'active' : ''}`}>
        <div>
          {Icon && <Icon color="inherit"/>}
        </div>
        <div>{label}</div>
      </div>
    </div>
  );
}
