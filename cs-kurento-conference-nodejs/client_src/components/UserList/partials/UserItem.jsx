import React from 'react';

class UserItem extends React.Component {
    constructor(props){
        super(props);
    }
    shareScreen(){
        var screen = new Screen('screen-unique-id'); // argument is optional

// on getting local or remote streams
        screen.onaddstream = function(e) {
            document.body.appendChild(e.video);
        };
        screen.check();

        screen.share();
    }
    render () {
        var rootClass = this.props.current ? 'c-user-item c-user-item--current':'c-user-item';
        return <div className={rootClass}>
            <p title={this.props.userName} className="c-user-item__name">
                <i className="c-user-item__user-ico fa fa-user-o "/>
                {this.props.userName}</p>
            <div className="c-user-item__controls">
                {this.props.current && !this.props.desksharing
                && < i title="Broadcast desktop"
                       onClick={this.props.startDeskshareBroadcast}
                       className="c-user-item__control fa fa-window-maximize" />}
                {this.props.current && this.props.desksharing
                && <i title="Stop desktop broadcasting"
                      onClick={this.props.stopDeskshare}
                      className="c-user-item__control c-user-item__control--off fa fa-stop"/>}
                {this.props.current && !this.props.broadcasting
                 && <i title="Broadcast webcam"
                       onClick={this.props.startBroadcast}
                       className="c-user-item__control fa fa fa-video-camera"/>}
                {this.props.current && this.props.broadcasting
                && <i title="Stop broadcasting"
                      onClick={this.props.stopBroadcast}
                      className="c-user-item__control c-user-item__control--off fa fa-stop"/>}

            </div>
        </div>
    }
}

export default UserItem;