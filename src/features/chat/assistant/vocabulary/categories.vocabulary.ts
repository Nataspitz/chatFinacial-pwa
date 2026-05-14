export interface CategoryVocabularyItem {
  name: string
  aliases: string[]
}

export const categoryVocabulary: CategoryVocabularyItem[] = [
  { name: 'internet', aliases: ['internet', 'wifi', 'wi-fi', 'rede'] },
  { name: 'mercado', aliases: ['mercado', 'supermercado', 'compras', 'compra do mes'] },
  { name: 'energia', aliases: ['energia', 'luz', 'conta de luz'] },
  { name: 'agua', aliases: ['agua', 'conta de agua'] },
  { name: 'manutencao', aliases: ['manutencao', 'conserto', 'reparo', 'obra'] },
  { name: 'limpeza', aliases: ['limpeza', 'faxina', 'diaria'] },
  { name: 'reserva', aliases: ['reserva', 'airbnb', 'booking', 'hospedagem'] },
  { name: 'alimentacao', aliases: ['ifood', 'restaurante', 'almoco', 'lanche', 'pizza'] },
  { name: 'transporte', aliases: ['uber', '99', 'onibus', 'metro', 'gasolina'] },
  { name: 'moradia', aliases: ['aluguel', 'condominio', 'moradia'] },
  { name: 'renda', aliases: ['salario', 'freela', 'renda'] }
]

