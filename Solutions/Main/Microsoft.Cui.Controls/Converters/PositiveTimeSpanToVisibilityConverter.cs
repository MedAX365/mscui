//-----------------------------------------------------------------------
// <copyright file="PositiveTimeSpanToVisibilityConverter.cs" company="Microsoft Corporation and Crown copyright 2007 - 2009.">
// Copyright (c) Microsoft Corporation and Crown copyright 2007 - 2009.
// All rights reserved.
//
// CERTAIN PARTS OF THIS WORK CONTAIN SOFTWARE CODE THAT IS LICENSED 
// FOR USE UNDER THE MICROSOFT PUBLIC LICENSE. DISTRIBUTION, IN SOURCE CODE 
// OR OBJECT CODE FORM, OF THOSE PARTS MUST COMPLY WITH THE TERMS OF THE 
// PUBLIC LICENSE. SEE http://www.microsoft.com/opensource/licenses.mspx 
// FOR DETAILS.  
// IF YOU BRING A PATENT CLAIM AGAINST ANY CONTRIBUTOR OVER PATENTS THAT 
// YOU CLAIM ARE INFRINGED BY THE PUBLIC LICENSE SOFTWARE, YOUR PATENT 
// LICENSE FROM SUCH CONTRIBUTOR TO THE SOFTWARE ENDS AUTOMATICALLY.
//
// THIS CODE AND INFORMATION ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY 
// KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A
// PARTICULAR PURPOSE.
// </copyright>
// <date>07-Sep-2009</date>
// <summary>Converts a non zero timespan to a visibility.</summary>
//-----------------------------------------------------------------------
namespace Microsoft.Cui.Controls
{
    using System;
    using System.Windows;
    using System.Windows.Data;
    using System.Collections;

    /// <summary>
    /// Converts a non zero timespan to a visibility.
    /// </summary>
    public class PositiveTimeSpanToVisibilityConverter : IValueConverter
    {
        #region IValueConverter Members
        /// <summary>
        /// Convert forward function.
        /// </summary>
        /// <param name="value">The source value.</param>
        /// <param name="targetType">The target type.</param>
        /// <param name="parameter">The parameter.</param>
        /// <param name="culture">The culture info.</param>
        /// <returns>The converted value.</returns>
        public object Convert(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
        {
            bool negated = false;

            if (parameter != null)
            {
                if (!bool.TryParse(parameter.ToString(), out negated))
                {
                    negated = false;
                }
            }

            TimeSpan? timeSpan = value as TimeSpan?;
            if (timeSpan != null && timeSpan.HasValue)
            {
                if (timeSpan.Value != TimeSpan.Zero)
                {
                    return negated ? Visibility.Collapsed : Visibility.Visible;
                }
                else
                {
                    return negated ? Visibility.Visible : Visibility.Collapsed;
                }
            }

            return negated ? Visibility.Collapsed : Visibility.Visible;
        }

        /// <summary>
        /// Convert back function.
        /// </summary>
        /// <param name="value">The source value.</param>
        /// <param name="targetType">The target type.</param>
        /// <param name="parameter">The parameter.</param>
        /// <param name="culture">The culture info.</param>
        /// <returns>The converted back value.</returns>
        public object ConvertBack(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
        {
            throw new NotImplementedException();
        }

        #endregion
    }
}
