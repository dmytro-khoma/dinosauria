"""
Build assets/js/data.js from the facts below and the image credits.

    python tools/build_data.py path/to/dino_images.json

The facts are approximate textbook values (sizes vary between sources).
Image credits (author, licence, source page) were collected once from the
Wikimedia Commons API into a JSON file. Image sizes are read with ffprobe.
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# slug: name, meaning, period, start/end (million years ago), diet, group,
#       length (m), weight (t), region, year named, short text
FACTS = [
    ("tyrannosaurus", "Tyrannosaurus", "tyrant lizard", "cretaceous", 68, 66, "carnivore", "theropod", 12.3, 8.4, "North America", 1905,
     "One of the last non-bird dinosaurs. Its bite was among the strongest of any land animal, strong enough to crush bone."),
    ("triceratops", "Triceratops", "three-horned face", "cretaceous", 68, 66, "herbivore", "ceratopsian", 9, 9, "North America", 1889,
     "A heavy plant-eater with three horns and a solid bony frill. It lived at the same time and place as Tyrannosaurus."),
    ("stegosaurus", "Stegosaurus", "roof lizard", "jurassic", 155, 145, "herbivore", "armoured", 9, 5, "North America", 1877,
     "Famous for the two rows of plates on its back and the four spikes on its tail. Its brain was small for its size."),
    ("brachiosaurus", "Brachiosaurus", "arm lizard", "jurassic", 154, 150, "herbivore", "sauropod", 22, 40, "North America", 1903,
     "Its front legs were longer than its back legs, so it stood like a giraffe and could feed high in the trees."),
    ("velociraptor", "Velociraptor", "swift thief", "cretaceous", 75, 71, "carnivore", "theropod", 2, 0.015, "Asia", 1924,
     "Much smaller than in films, about the size of a turkey. It had feathers and a large curved claw on each foot."),
    ("spinosaurus", "Spinosaurus", "spine lizard", "cretaceous", 99, 93, "carnivore", "theropod", 14, 7, "Africa", 1915,
     "A long predator with a sail on its back. It probably spent a lot of time in rivers, hunting fish."),
    ("ankylosaurus", "Ankylosaurus", "fused lizard", "cretaceous", 68, 66, "herbivore", "armoured", 8, 6, "North America", 1908,
     "Covered in bony armour plates, with a heavy club at the end of its tail to defend itself."),
    ("parasaurolophus", "Parasaurolophus", "near crested lizard", "cretaceous", 77, 73, "herbivore", "ornithopod", 9.5, 3, "North America", 1922,
     "A duck-billed dinosaur with a long hollow crest. Air moving through the crest may have made a loud, low sound."),
    ("diplodocus", "Diplodocus", "double beam", "jurassic", 154, 152, "herbivore", "sauropod", 26, 15, "North America", 1878,
     "A very long sauropod with a whip-like tail. Its name comes from the double bones under its tail."),
    ("allosaurus", "Allosaurus", "different lizard", "jurassic", 155, 145, "carnivore", "theropod", 9.5, 2.3, "North America, Europe", 1877,
     "The top predator of the Late Jurassic. It had small horns above its eyes and a light, strong skull."),
    ("pachycephalosaurus", "Pachycephalosaurus", "thick-headed lizard", "cretaceous", 70, 66, "herbivore", "dome-headed", 4.5, 0.45, "North America", 1943,
     "Its skull had a bony dome up to 25 cm thick. Scientists still argue about whether it used it for head-butting."),
    ("iguanodon", "Iguanodon", "iguana tooth", "cretaceous", 126, 122, "herbivore", "ornithopod", 10, 3.5, "Europe", 1825,
     "One of the first dinosaurs ever named. Its thumb ended in a sharp spike, which was first placed on its nose by mistake."),
    ("carnotaurus", "Carnotaurus", "meat-eating bull", "cretaceous", 72, 69, "carnivore", "theropod", 8, 1.5, "South America", 1985,
     "A fast predator with two short horns above its eyes and tiny arms, even smaller than those of T. rex."),
    ("archaeopteryx", "Archaeopteryx", "ancient wing", "jurassic", 151, 149, "carnivore", "theropod", 0.5, 0.001, "Europe", 1861,
     "Half bird, half dinosaur: it had feathers and wings, but also teeth, claws and a long bony tail."),
    ("therizinosaurus", "Therizinosaurus", "scythe lizard", "cretaceous", 70, 68, "herbivore", "theropod", 10, 5, "Asia", 1954,
     "A strange plant-eating theropod with claws up to 50 cm long, probably used to pull down branches."),
    ("gallimimus", "Gallimimus", "chicken mimic", "cretaceous", 70, 68, "omnivore", "theropod", 6, 0.44, "Asia", 1972,
     "A light, ostrich-like dinosaur with a toothless beak. It was one of the fastest runners of its time."),
    ("coelophysis", "Coelophysis", "hollow form", "triassic", 216, 203, "carnivore", "theropod", 3, 0.025, "North America", 1889,
     "A small early predator with hollow bones. Hundreds of skeletons were found together at Ghost Ranch, New Mexico."),
    ("plateosaurus", "Plateosaurus", "broad lizard", "triassic", 214, 204, "herbivore", "sauropod", 7.5, 1, "Europe", 1837,
     "An early relative of the giant sauropods. It walked on two legs and is one of the best-known Triassic dinosaurs."),
    ("herrerasaurus", "Herrerasaurus", "Herrera's lizard", "triassic", 231, 229, "carnivore", "theropod", 4.5, 0.25, "South America", 1963,
     "One of the oldest known dinosaurs. It was named after the farmer who first found its bones in Argentina."),
    ("dilophosaurus", "Dilophosaurus", "two-crested lizard", "jurassic", 193, 190, "carnivore", "theropod", 7, 0.4, "North America", 1970,
     "A large early predator with two thin crests on its head. There is no evidence for the venom or neck frill from films."),
    ("argentinosaurus", "Argentinosaurus", "Argentina lizard", "cretaceous", 96, 92, "herbivore", "sauropod", 35, 70, "South America", 1993,
     "One of the largest land animals ever. A single back bone is taller than an adult person."),
    ("giganotosaurus", "Giganotosaurus", "giant southern lizard", "cretaceous", 99, 97, "carnivore", "theropod", 12.5, 7, "South America", 1995,
     "A giant predator about as large as T. rex, with a longer, narrower skull and blade-like teeth."),
    ("microraptor", "Microraptor", "small thief", "cretaceous", 125, 120, "carnivore", "theropod", 0.8, 0.001, "Asia", 2000,
     "A crow-sized dinosaur with feathered wings on both its arms and legs. It could glide between trees."),
    ("edmontosaurus", "Edmontosaurus", "Edmonton lizard", "cretaceous", 73, 66, "herbivore", "ornithopod", 12, 5.6, "North America", 1917,
     "A large duck-billed dinosaur with hundreds of teeth for grinding plants. Some fossils even keep traces of skin."),
    ("styracosaurus", "Styracosaurus", "spiked lizard", "cretaceous", 75.5, 75, "herbivore", "ceratopsian", 5.5, 2.7, "North America", 1913,
     "Its frill was edged with long spikes, and it had one big horn on its nose, like a rhino."),
    ("kentrosaurus", "Kentrosaurus", "spiky lizard", "jurassic", 152, 152, "herbivore", "armoured", 4.5, 1, "Africa", 1915,
     "A smaller African cousin of Stegosaurus, with plates on its neck and long spikes along its back and tail."),
    ("oviraptor", "Oviraptor", "egg thief", "cretaceous", 75, 71, "omnivore", "theropod", 1.6, 0.03, "Asia", 1924,
     "Named as an egg thief, but later fossils show it was sitting on its own eggs, like a bird on a nest."),
    ("protoceratops", "Protoceratops", "first horned face", "cretaceous", 75, 71, "herbivore", "ceratopsian", 2, 0.08, "Asia", 1923,
     "A sheep-sized horned dinosaur. One famous fossil shows it locked in a fight with a Velociraptor."),
    ("baryonyx", "Baryonyx", "heavy claw", "cretaceous", 130, 125, "carnivore", "theropod", 9, 1.7, "Europe", 1986,
     "A fish-eater with a crocodile-like snout. Fish scales were found in its stomach area."),
    ("deinonychus", "Deinonychus", "terrible claw", "cretaceous", 115, 108, "carnivore", "theropod", 3.4, 0.075, "North America", 1969,
     "Its discovery showed that some dinosaurs were active and agile, which changed how scientists saw dinosaurs."),
]

KEYS = ["slug", "name", "meaning", "period", "from", "to", "diet", "group",
        "length", "weight", "region", "named", "text"]


def size(path: Path) -> tuple[int, int]:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    w, h = out.split(",")
    return int(w), int(h)


def main() -> None:
    credits = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    items = []
    for row in FACTS:
        item = dict(zip(KEYS, row))
        image = ROOT / "assets" / "img" / f"{item['slug']}.webp"
        width, height = size(image)
        c = credits[item["slug"]]
        item["image"] = {
            "src": f"assets/img/{item['slug']}.webp",
            "width": width,
            "height": height,
            "author": c["artist"],
            "license": c["license"],
            "licenseUrl": c.get("licenseUrl", ""),
            "source": c["page"],
        }
        items.append(item)

    js = (
        "/* GENERATED by tools/build_data.py. Edit the facts there, not here. */\n"
        "window.DINOSAURS = " + json.dumps(items, ensure_ascii=False, indent=2) + ";\n"
    )
    (ROOT / "assets" / "js" / "data.js").write_text(js, encoding="utf-8")
    print(f"wrote {len(items)} dinosaurs")


if __name__ == "__main__":
    main()
