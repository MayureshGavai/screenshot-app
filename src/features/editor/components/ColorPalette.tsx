import { ANNOTATION_COLORS } from "../../../constants/colors";

interface ColorPaletteProps {
  selectedColor: string;
  onChange: (color: string) => void;
}

const ColorPalette = ({ selectedColor, onChange }: ColorPaletteProps) => {
  return (
    <div className="grid grid-cols-4 gap-2">
      {ANNOTATION_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          title={color}
          aria-label={`Select color ${color}`}
          aria-pressed={selectedColor === color}
          onClick={() => onChange(color)}
          className={`size-7 rounded-full border border-border transition ${
            selectedColor === color
              ? "ring-2 ring-primary ring-offset-2"
              : "hover:scale-110"
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
};

export default ColorPalette;
