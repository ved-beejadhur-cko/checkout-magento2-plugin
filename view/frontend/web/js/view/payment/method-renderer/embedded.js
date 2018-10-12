/**
 * Checkout.com Magento 2 Payment module (https://www.checkout.com)
 *
 * Copyright (c) 2017 Checkout.com (https://www.checkout.com)
 * Author: David Fiaty | integration@checkout.com
 *
 * License GNU/GPL V3 https://www.gnu.org/licenses/gpl-3.0.en.html
 */

/*browser:true*/
/*global define*/

define(
    [
        'jquery',
        'CheckoutCom_Magento2/js/view/payment/method-renderer/cc-form',
        'Magento_Vault/js/view/payment/vault-enabler',
        'CheckoutCom_Magento2/js/view/payment/adapter',
        'Magento_Checkout/js/model/quote',
        'Magento_Ui/js/model/messageList',
        'mage/url',
        'Magento_Checkout/js/action/set-payment-information',
        'Magento_Checkout/js/model/full-screen-loader',
        'Magento_Checkout/js/model/payment/additional-validators',
        'Magento_Checkout/js/checkout-data',
        'Magento_Checkout/js/action/redirect-on-success'
    ],
    function($, Component, VaultEnabler, CheckoutCom, quote, globalMessages, url, setPaymentInformationAction, fullScreenLoader, additionalValidators, checkoutData, redirectOnSuccessAction, customer) {
        'use strict';

        window.checkoutConfig.reloadOnBillingAddress = true;

        return Component.extend({
            defaults: {
                active: true,
                template: 'CheckoutCom_Magento2/payment/embedded',
                code: 'checkout_com',
                card_token_id: null,
                redirectAfterPlaceOrder: true,
                card_bin: null
            },

            /**
             * @returns {exports}
             */
            initialize: function(config, messageContainer) {
                this._super();
                this.initObservable();
                this.messageContainer = messageContainer || config.messageContainer || globalMessages;

                this.vaultEnabler = new VaultEnabler();
                this.vaultEnabler.setPaymentCode(this.getVaultCode());

                return this;
            },

            /**
             * @returns {exports}
             */
            initObservable: function () {
                this._super()
                    .observe('isHidden');

                return this;
            },

            /**
             * @returns {bool}
             */
            isVisible: function () {
                return this.isHidden(this.messageContainer.hasMessages());
            },

            /**
             * @returns {bool}
             */
            removeAll: function () {
                this.messageContainer.clear();
            },

            /**
             * @returns {void}
             */
            onHiddenChange: function (isHidden) {
                var self = this;
                // Hide message block if needed
                if (isHidden) {
                    setTimeout(function () {
                        $(self.selector).hide('blind', {}, 500)
                    }, 10000);
                }
            },

            /**
             * @returns {bool}
             */
            isVaultEnabled: function() {
                return this.vaultEnabler.isVaultEnabled();
            },

            /**
             * @returns {string}
             */
            getVaultCode: function() {
                return window.checkoutConfig.payment[this.getCode()].ccVaultCode;
            },

            /**
             * @returns {string}
             */
            getCode: function() {
                return CheckoutCom.getCode();
            },

            /**
             * @param {string} card_token_id
             */
            setCardTokenId: function(card_token_id) {
                this.card_token_id = card_token_id;
            },

            /**
             * @returns {bool}
             */
            isActive: function() {
                return CheckoutCom.getPaymentConfig()['isActive'];
            },

            /**
             * @returns {string}
             */
            getPublicKey: function() {
                return CheckoutCom.getPaymentConfig()['public_key'];
            },

            /**
             * @returns {string}
             */
            getQuoteValue: function() {
                return quote.getTotals();
            },

            /**
             * @returns {string}
             */
            getQuoteCurrency: function() {
                return CheckoutCom.getPaymentConfig()['quote_currency'];
            },

            /**
             * @returns {bool}
             */
            isCardAutosave: function() {
                return CheckoutCom.getPaymentConfig()['card_autosave'];
            },
            
            /**
             * @returns {string}
             */
            getRedirectUrl: function() {
                return url.build('checkout_com/payment/placeOrder');
            },

            /**
             * @returns {void}
             */
            saveSessionData: function() {
                // Get self
                var self = this;

                // Prepare the session data
                var sessionData = {
                    saveShopperCard: $('#checkout_com_enable_vault').is(":checked"),
                    customerEmail: self.getEmailAddress(),
                    cardBin: self.card_bin
                };

                // Send the session data to be saved
                $.ajax({
                    url: url.build('checkout_com/shopper/sessionData'),
                    type: "POST",
                    data: sessionData,
                    success: function(data, textStatus, xhr) {},
                    error: function(xhr, textStatus, error) {} // todo - improve error handling
                });
            },

            /**
             * @returns {string}
             */
            beforePlaceOrder: function() {
                // Get self
                var self = this;

                // Get the form
                var paymentForm = document.getElementById('embeddedForm');

                // Validate before submission
                if (additionalValidators.validate()) {
                    if (Frames.isCardValid()) {
                        // Submit frames form
                        Frames.submitCard();
                    }
                }
            },

            /**
             * @override
             */
            placeOrder: function() {
                var self = this;

                $.migrateMute = true;

                this.updateButtonState(false);
                this.getPlaceOrderDeferredObject()
                .fail(
                    function() {
                        self.updateButtonState(true);
                        $('html, body').animate({ scrollTop: 0 }, 'fast');
                        self.reloadEmbeddedForm();
                    }
                ).done(
                    function() {
                        self.afterPlaceOrder();

                        if (self.redirectAfterPlaceOrder) {
                            redirectOnSuccessAction.execute();
                        }
                    }
                );
            },
                        
            /**
             * @returns {void}
             */
            getEmbeddedForm: function() {
                // Get self
                var self = this;

                // Prepare parameters
                var ckoTheme = CheckoutCom.getPaymentConfig()['embedded_theme'];
                var css_file = CheckoutCom.getPaymentConfig()['css_file'];
                var custom_css = CheckoutCom.getPaymentConfig()['custom_css'];
                var ckoThemeOverride = ((custom_css) && custom_css !== '' && css_file == 'custom') ? custom_css : undefined;
                var redirectUrl = self.getRedirectUrl();
                var threeds_enabled = CheckoutCom.getPaymentConfig()['three_d_secure']['enabled'];
                var paymentForm = document.getElementById('embeddedForm');

                // Freeze the place order button on initialisation
                $('#ckoPlaceOrder').attr("disabled",true);

                // Initialise the embedded form
                Frames.init({
                    publicKey: self.getPublicKey(),
                    containerSelector: '#cko-form-holder',
                    theme: ckoTheme,
                    debugMode: true,
                    themeOverride: ckoThemeOverride,
                    frameActivated: function () {
                        $('#ckoPlaceOrder').attr("disabled", true);
                    },
                    cardValidationChanged: function() {
                        self.updateButtonState(!(Frames.isCardValid() && quote.billingAddress() != null));
                    },
                    cardTokenised: function(event) {
                        // Keep the card info
                        self.card_bin = event.data.card.bin;

                        // Save checkout info in PHP session
                        self.saveSessionData();

                        // Set the card token
                        self.setCardTokenId(event.data.cardToken);

                        // Add the card token to the form
                        Frames.addCardToken(paymentForm, event.data.cardToken);

                        // Place order
                        window.location.replace(redirectUrl + '?cko-card-token=' + event.data.cardToken + '&cko-context-id=' + self.getEmailAddress());
                    },
                });  
            },

            /**
             * @returns {void}
             */
            updateButtonState: function(status) {
                $('#ckoPlaceOrder').attr("disabled", status);
            },

            /**
             * @returns {void}
             */
            reloadEmbeddedForm: function() {
                // Get self
                var self = this;

                // Reload the iframe
                $('#cko-form-holder form iframe').remove();
                self.getEmbeddedForm();
            },
        });
    }
);