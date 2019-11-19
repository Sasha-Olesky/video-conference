import React from 'react';

class Header extends React.Component {
    render() {
        return <header className="c-header">
                    <h1 className="c-header__title">
                        Conference: "{this.props.conferenceName}"
                    </h1>
                    <a title="Exit room" className="c-header__logout" href="/logout">
                        <i className="fa fa-power-off" />
                    </a>
               </header>
    }
}

export default Header;