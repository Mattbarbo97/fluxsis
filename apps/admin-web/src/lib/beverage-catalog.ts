export type BeverageSuggestion = {
  name: string;
  volume: string;
};

export const BEVERAGE_CATALOG: BeverageSuggestion[] = [
  // Cervejas
  { name: "Heineken", volume: "269ml" },
  { name: "Heineken", volume: "350ml" },
  { name: "Heineken", volume: "600ml" },
  { name: "Skol", volume: "269ml" },
  { name: "Skol", volume: "350ml" },
  { name: "Skol", volume: "473ml" },
  { name: "Brahma", volume: "350ml" },
  { name: "Brahma", volume: "473ml" },
  { name: "Brahma", volume: "600ml" },
  { name: "Antarctica", volume: "350ml" },
  { name: "Antarctica", volume: "600ml" },
  { name: "Original", volume: "300ml" },
  { name: "Original", volume: "600ml" },
  { name: "Stella Artois", volume: "275ml" },
  { name: "Stella Artois", volume: "330ml" },
  { name: "Corona Extra", volume: "330ml" },
  { name: "Budweiser", volume: "350ml" },
  { name: "Amstel", volume: "350ml" },
  { name: "Spaten", volume: "350ml" },
  { name: "Eisenbahn Pilsen", volume: "350ml" },
  { name: "Colorado Appia", volume: "350ml" },

  // Refrigerantes
  { name: "Coca-Cola", volume: "350ml" },
  { name: "Coca-Cola", volume: "600ml" },
  { name: "Coca-Cola", volume: "1L" },
  { name: "Coca-Cola", volume: "2L" },
  { name: "Guaraná Antarctica", volume: "350ml" },
  { name: "Guaraná Antarctica", volume: "2L" },
  { name: "Fanta Laranja", volume: "350ml" },
  { name: "Fanta Laranja", volume: "2L" },
  { name: "Sprite", volume: "350ml" },
  { name: "Pepsi", volume: "350ml" },

  // Águas
  { name: "Água Crystal", volume: "500ml" },
  { name: "Água Crystal", volume: "1,5L" },
  { name: "Água Bonafont", volume: "500ml" },
  { name: "Água com gás Crystal", volume: "500ml" },

  // Energéticos
  { name: "Red Bull", volume: "250ml" },
  { name: "Red Bull", volume: "355ml" },
  { name: "Monster Energy", volume: "473ml" },
  { name: "TNT Energy Drink", volume: "269ml" },
  { name: "Fusion", volume: "269ml" },

  // Destilados
  { name: "Vodka Smirnoff", volume: "998ml" },
  { name: "Vodka Absolut", volume: "750ml" },
  { name: "Whisky Red Label", volume: "1L" },
  { name: "Whisky Black Label", volume: "1L" },
  { name: "Cachaça 51", volume: "965ml" },
  { name: "Gin Tanqueray", volume: "750ml" },
  { name: "Gin Rocks", volume: "1L" },
  { name: "Licor 43", volume: "700ml" },
];
