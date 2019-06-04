<?php

/**
 * Checkout.com
 * Authorised and regulated as an electronic money institution
 * by the UK Financial Conduct Authority (FCA) under number 900816.
 *
 * PHP version 7
 *
 * @category  Magento2
 * @package   Checkout.com
 * @author    Platforms Development Team <platforms@checkout.com>
 * @copyright 2010-2019 Checkout.com
 * @license   https://opensource.org/licenses/mit-license.html MIT License
 * @link      https://docs.checkout.com/
 */

namespace CheckoutCom\Magento2\Model\Config\Backend\Source;

class ConfigGooglePayButton implements \Magento\Framework\Option\ArrayInterface {

    const BUTTON_BLACK = 'black';
    const BUTTON_WHITE = 'white';

    /**
     * Possible Google Pay button styles
     *
     * @return array
     */
    public function toOptionArray() {
        return [
            [
                'value' => self::BUTTON_BLACK,
                'label' => __('Black')
            ],
            [
                'value' => self::BUTTON_WHITE,
                'label' => __('White')
            ],
        ];
    }

}