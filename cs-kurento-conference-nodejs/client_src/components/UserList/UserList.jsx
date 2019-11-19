import React from 'react';
import UsetItem from './partials/UserItem.jsx'


class UserList extends React.Component {
    constructor(props){
        super(props);
    }
    render() {
        let users = this.props.users.filter((user)=>{
           return !user.isDeskshareSubuser;
        });
        let usersElements = users.map((user)=>{
            return <UsetItem userName={user.name}
                             userId={user.id}
                             key={user.id}
                             current={user.current}
                             broadcasting={user.broadcasting}
                             desksharing={user.desksharing}
                             webRtcPeer={user.webRtcPeer}
                             startBroadcast={this.props.startBroadcast}
                             startDeskshareBroadcast={this.props.startDeskshareBroadcast}
                             stopDeskshare={this.props.stopDeskshare}
                             stopBroadcast={this.props.stopBroadcast}/>
        });

        return <div className="c-user-list">
            {usersElements}
        </div>
    }
}

export default UserList;