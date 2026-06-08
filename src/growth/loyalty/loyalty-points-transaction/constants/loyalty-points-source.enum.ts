export enum LoyaltyPointsSource {
  ORDER = 'ORDER', //POR COMPRAS
  PAYMENT = 'PAYMENT', //POR METODO DE PAGO
  REFERRAL = 'REFERRAL', //CAMPAÑAS
  PROMOTION = 'PROMOTION', //REFERIDO
  MANUAL_ADJUST = 'MANUAL_ADJUST', //AJUSTE MANUAL
  REDEMPTION = 'REDEMPTION', //CANJE DE PUNTOS
  /** Automatic reversal when an order is cancelled or no longer fully paid. */
  ORDER_REVERSAL = 'ORDER_REVERSAL',
}
